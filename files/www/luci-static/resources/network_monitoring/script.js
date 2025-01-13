function getCountryLatLng(countryCode) {
  const countries = {
    'US': [37.0902, -95.7129],
    'DE': [51.1657, 10.4515],
    'FR': [46.2276, 2.2137],
    'JP': [36.2048, 138.2529],
    'IN': [20.5937, 78.9629]
  };
  return countries[countryCode];
}

function animateCircleRadius(circle, start, end, duration) {
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function for smooth animation
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
    
    const currentRadius = start + (end - start) * easeProgress;
    circle.setRadius(currentRadius);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// Move all code inside a DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
  // Global DataManager object
  const DataManager = {
    data: {},
    modules: [],
    registerModule: function(module, keys) {
      this.modules.push({ module: module, keys: keys });
    },
    updateData: function(newData) {
      this.data = newData;
      this.modules.forEach(({ module, keys }) => {
        const relevantData = {};
        keys.forEach(key => {
          if (newData[key]) {
            relevantData[key] = newData[key];
          }
        });
        if (Object.keys(relevantData).length > 0) {
          module.onDataUpdate(relevantData);
        }
      });
    }
  };

  // **************************
  // Function to create module container with expand button
  function createModuleContainer(moduleId, module) {
    const container = document.getElementById(moduleId);
    if (!container) {
      console.error(`Container element with ID '${moduleId}' not found.`);
      return;
    }

    // Clear the container
    container.innerHTML = '';

    // Create the module structure
    const moduleStructure = document.createElement('div');
    moduleStructure.className = 'module-structure';

    // Create expand button
    const expandButton = document.createElement('button');
    expandButton.className = 'expand-button';
    expandButton.setAttribute('title', 'Expand view');
    expandButton.onclick = function(e) {
      e.stopPropagation();
      openOverlay(module);
    };

    // Create chart container and canvas
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    chartContainer.appendChild(canvas);

    // Size canvas properly
    //const rect = chartContainer.getBoundingClientRect();
    //canvas.width = rect.width * window.devicePixelRatio;
    //canvas.height = rect.height * window.devicePixelRatio;

    // Add elements to container in correct order
    moduleStructure.appendChild(expandButton);
    moduleStructure.appendChild(chartContainer);
    container.appendChild(moduleStructure);

    // Store references in module
    module.containerId = moduleId;
    module.chartContainer = chartContainer;
    module.canvas = canvas;

    // Initial render
    module.render(canvas);
  }

  // Function to open overlay with enlarged module
  function openOverlay(module) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'popup';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.textContent = 'Close';
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'popup-content';
  
    // Wrap the module structure (chart) in a .popup-chart div
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'popup-chart';
  
    // Get the module structure containing the chart
    const moduleStructure = document.querySelector(`#${module.containerId} .module-structure`);
  
    // Append moduleStructure into chartWrapper
    chartWrapper.appendChild(moduleStructure);
  
    // Create table container and table
    const tableContainer = document.createElement('div');
    tableContainer.className = 'popup-table';
    const table = document.createElement('table');
    table.className = 'data-table';
    tableContainer.appendChild(table);
    
    // Add elements to content and popup
    content.appendChild(chartWrapper);
    content.appendChild(tableContainer);
    popup.appendChild(closeButton);
    popup.appendChild(content);
    overlay.appendChild(popup);
    
    // Generate initial table data
    if (module.generateTable) {
      module.generateTable(table, DataManager.data);
    }
    
    // Store table reference for updates
    module.popupTable = table;
    
    // Update the module's onDataUpdate to also update table
    const originalOnDataUpdate = module.onDataUpdate;
    module.onDataUpdate = function(data) {
      originalOnDataUpdate.call(this, data);
      if (this.popupTable && this.generateTable) {
        // Clear existing rows
        while (this.popupTable.rows.length > 0) {
          this.popupTable.deleteRow(0);
        }
        // Generate new rows
        this.generateTable(this.popupTable, data);
      }
    };
    
    // Handle closing
    const handleClose = () => {
      const originalContainer = document.getElementById(module.containerId);
      originalContainer.appendChild(moduleStructure);
      document.body.removeChild(overlay);
    
      // Reset onDataUpdate to original
      module.onDataUpdate = originalOnDataUpdate;
      module.popupTable = null;
    };
    
    closeButton.onclick = (e) => {
      e.stopPropagation();
      handleClose();
    };
    overlay.onclick = handleClose;
    popup.onclick = (e) => e.stopPropagation();
    
    // Add to body
    document.body.appendChild(overlay);
    
    if (module.chartInstance) {
      // Just call resize without manually setting dimensions
      module.chartInstance.resize();
    }
  }

  // **************************
  // Bandwidth Usage Over Time Module
  // **************************
  const bandwidthModule = {
    chartInstance: null,
    containerId: null, // Will be set by createModuleContainer
    chartContainer: null, // New property to store chart container reference
    canvas: null,
    render: function(canvas) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const context = canvas.getContext('2d');
      this.chartInstance = new Chart(context, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Upload Bandwidth (Mbps)',
              borderColor: 'rgba(54, 162, 235, 1)',
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              data: []
            },
            {
              label: 'Download Bandwidth (Mbps)',
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              data: []
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'realtime',
              realtime: {
                duration: 60000,
                refresh: 1000,
                delay: 1000
              }
            },
            y: {
              title: {
                display: true,
                text: 'Bandwidth (Mbps)'
              }
            }
          }
        }
      });
    },
    onDataUpdate: function(data) {
      const now = Date.now();
      this.chartInstance.data.datasets[0].data.push({ x: now, y: data.bandwidth.upload });
      this.chartInstance.data.datasets[1].data.push({ x: now, y: data.bandwidth.download });
      this.chartInstance.update('quiet');
    },
    generateTable: function(table, data) {
      const bandwidthData = data.bandwidth;
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'Upload (Mbps)';
      headerRow.insertCell().textContent = 'Download (Mbps)';
      const dataRow = table.insertRow();
      dataRow.insertCell().textContent = bandwidthData.upload.toFixed(2);
      dataRow.insertCell().textContent = bandwidthData.download.toFixed(2);
    }
  };
  DataManager.registerModule(bandwidthModule, ['bandwidth']);
  createModuleContainer('bandwidthModule', bandwidthModule);

  // **************************
  // Connections by Country Module
  // **************************
  const mapModule = {
    mapInstance: null,
    circles: {},
    render: function(canvas) {
      // Use the chartContainer created by createModuleContainer
      const container = this.chartContainer;
      container.innerHTML = '';  // Clear any previous content
  
      // Create an inner div for the map
      const mapContainer = document.createElement('div');
      mapContainer.style.width = '100%';
      mapContainer.style.height = '100%';
      container.appendChild(mapContainer);
  
      // If a mapInstance already exists, remove it
      if (this.mapInstance) {
        this.mapInstance.remove();
      }
  
      // Create the Leaflet map
      this.mapInstance = Leaflet.map(mapContainer, {
        center: [40, 0],
        zoom: 1,
        minZoom: 1,
        maxZoom: 10,
        zoomControl: true,
        attributionControl: true
      });
  
      // Add the tile layer
      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.mapInstance);
  
      const resizeObserver = new ResizeObserver(() => {
        this.mapInstance.invalidateSize();
      });
      
      resizeObserver.observe(container);

      if (DataManager.data.connectionsByCountry) {
        this.updateMap(DataManager.data.connectionsByCountry);
      }

    },
    onDataUpdate: function(data) {
      this.updateMap(data.connectionsByCountry);
    },
    updateMap: function(data) {
      if (!data || !this.mapInstance) return;
  
      const currentCountries = data.map(cd => cd.country);
  
      // Remove circles for countries no longer present
      for (let country in this.circles) {
        if (!currentCountries.includes(country)) {
          this.mapInstance.removeLayer(this.circles[country]);
          delete this.circles[country];
        }
      }
  
      data.forEach(countryData => {
        const latLng = getCountryLatLng(countryData.country);
        if (latLng) {
          let circle = this.circles[countryData.country];
          if (circle) {
            // Animate radius change
            const startRadius = circle.getRadius();
            const endRadius = countryData.connections * 5000;
            animateCircleRadius(circle, startRadius, endRadius, 500);
            // Update popup content
            circle.getPopup().setContent(`
              <strong>${countryData.country}</strong><br>
              Connections: ${countryData.connections}<br>
              Bandwidth: ${countryData.bandwidth} MB
            `);
          } else {
            // Create new circle
            circle = Leaflet.circle(latLng, {
              color: 'red',
              radius: countryData.connections * 5000
            }).addTo(this.mapInstance);
            circle.bindPopup(`
              <strong>${countryData.country}</strong><br>
              Connections: ${countryData.connections}<br>
              Bandwidth: ${countryData.bandwidth} MB
            `);
            this.circles[countryData.country] = circle;
          }
        }
      });
    },
    generateTable: function(table, data) {
      const connectionsData = data.connectionsByCountry;
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'Country';
      headerRow.insertCell().textContent = 'Connections';
      headerRow.insertCell().textContent = 'Bandwidth (MB)';
      connectionsData.forEach(item => {
        const row = table.insertRow();
        row.insertCell().textContent = item.country;
        row.insertCell().textContent = item.connections;
        row.insertCell().textContent = item.bandwidth;
      });
    }
  };
  
  DataManager.registerModule(mapModule, ['connectionsByCountry']);
  createModuleContainer('mapModule', mapModule);

  // **************************
  // Top Domains Module
  // **************************
  const domainsModule = {
    chartInstance: null,
    containerId: null, // Will be set by createModuleContainer
    chartContainer: null,
    canvas: null,
    render: function(canvas) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const context = canvas.getContext('2d');
      this.chartInstance = new Chart(context, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Connections',
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              data: []
            },
            {
              label: 'Bandwidth (MB)',
              backgroundColor: 'rgba(255, 99, 132, 0.6)',
              data: []
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: {
              beginAtZero: true
            }
          }
        }
      });
    },
    onDataUpdate: function(data) {
      this.chartInstance.data.labels = data.topDomains.map(item => item.domain);
      this.chartInstance.data.datasets[0].data = data.topDomains.map(item => item.connections);
      this.chartInstance.data.datasets[1].data = data.topDomains.map(item => item.bandwidth);
      this.chartInstance.update();
    },
    generateTable: function(table, data) {
      const domainsData = data.topDomains;
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'Domain';
      headerRow.insertCell().textContent = 'Connections';
      headerRow.insertCell().textContent = 'Bandwidth (MB)';
      domainsData.forEach(item => {
        const row = table.insertRow();
        row.insertCell().textContent = item.domain;
        row.insertCell().textContent = item.connections;
        row.insertCell().textContent = item.bandwidth;
      });
    }
  };
  DataManager.registerModule(domainsModule, ['topDomains']);
  createModuleContainer('domainsModule', domainsModule);

  // **************************
  // DNS Requests Over Time Module
  // **************************
  const dnsModule = {
    chartInstance: null,
    containerId: null, // Will be set by createModuleContainer
    chartContainer: null,
    canvas: null,
    render: function(canvas) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const context = canvas.getContext('2d');
      this.chartInstance = new Chart(context, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'DNS Requests',
              borderColor: 'rgba(153, 102, 255, 1)',
              backgroundColor: 'rgba(153, 102, 255, 0.2)',
              data: []
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'realtime',
              realtime: {
                duration: 60000,
                refresh: 1000,
                delay: 1000
              }
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Requests'
              }
            }
          }
        }
      });
    },
    onDataUpdate: function(data) {
      const now = Date.now();
      this.chartInstance.data.datasets[0].data.push({ x: now, y: data.dnsRequests });
      this.chartInstance.update('quiet');
    },
    generateTable: function(table, data) {
      const dnsRequests = data.dnsRequests;
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'Time';
      headerRow.insertCell().textContent = 'DNS Requests';
      const dataRow = table.insertRow();
      dataRow.insertCell().textContent = new Date().toLocaleTimeString();
      dataRow.insertCell().textContent = dnsRequests;
    }
  };
  DataManager.registerModule(dnsModule, ['dnsRequests']);
  createModuleContainer('dnsModule', dnsModule);

  // **************************
  // Bandwidth by Protocol Module
  // **************************
  const protocolsModule = {
    chartInstance: null,
    containerId: null, // Will be set by createModuleContainer
    chartContainer: null,
    canvas: null,
    render: function(canvas) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const context = canvas.getContext('2d');
      this.chartInstance = new Chart(context, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [
            {
              label: 'HTTP',
              backgroundColor: 'rgba(255, 159, 64, 0.6)',
              data: []
            },
            {
              label: 'HTTPS',
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              data: []
            },
            {
              label: 'FTP',
              backgroundColor: 'rgba(153, 102, 255, 0.6)',
              data: []
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'realtime',
              realtime: {
                duration: 60000,
                refresh: 1000,
                delay: 1000
              },
              stacked: true
            },
            y: {
              stacked: true,
              title: {
                display: true,
                text: 'Bandwidth (MB)'
              }
            }
          }
        }
      });
    },
    onDataUpdate: function(data) {
      const now = Date.now();
      this.chartInstance.data.labels.push(now);
      this.chartInstance.data.datasets.forEach(dataset => {
        dataset.data.push({
          x: now,
          y: data.protocolBandwidth[dataset.label]
        });
      });
      this.chartInstance.update('quiet');
    },
    generateTable: function(table, data) {
      const protocolData = data.protocolBandwidth;
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'Protocol';
      headerRow.insertCell().textContent = 'Bandwidth (MB)';
      for (const protocol in protocolData) {
        const row = table.insertRow();
        row.insertCell().textContent = protocol;
        row.insertCell().textContent = protocolData[protocol].toFixed(2);
      }
    }
  };
  DataManager.registerModule(protocolsModule, ['protocolBandwidth']);
  createModuleContainer('protocolsModule', protocolsModule);

  // **************************
  // Incoming vs Outgoing Traffic Module
  // **************************
  const trafficPieModule = {
    chartInstance: null,
    containerId: null, // Will be set by createModuleContainer
    chartContainer: null,
    canvas: null,
    render: function(canvas) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const context = canvas.getContext('2d');
      this.chartInstance = new Chart(context, {
        type: 'pie',
        data: {
          labels: ['Incoming', 'Outgoing'],
          datasets: [
            {
              data: [50, 50],
              backgroundColor: [
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 99, 132, 0.6)'
              ]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Incoming vs Outgoing Traffic'
            }
          }
        }
      });
    },
    onDataUpdate: function(data) {
      this.chartInstance.data.datasets[0].data = [data.trafficPie.incoming, data.trafficPie.outgoing];
      this.chartInstance.update();
    },
    generateTable: function(table, data) {
      const trafficData = data.trafficPie;
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'Type';
      headerRow.insertCell().textContent = 'Value';
      const incomingRow = table.insertRow();
      incomingRow.insertCell().textContent = 'Incoming';
      incomingRow.insertCell().textContent = trafficData.incoming;
      const outgoingRow = table.insertRow();
      outgoingRow.insertCell().textContent = 'Outgoing';
      outgoingRow.insertCell().textContent = trafficData.outgoing;
    }
  };
  DataManager.registerModule(trafficPieModule, ['trafficPie']);
  createModuleContainer('trafficPieModule', trafficPieModule);

  // **************************
  // Connections Count Over Time Module
  // **************************
  const connectionsModule = {
    chartInstance: null,
    containerId: null, // Will be set by createModuleContainer
    chartContainer: null,
    canvas: null,
    render: function(canvas) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const context = canvas.getContext('2d');
      this.chartInstance = new Chart(context, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Connections',
              borderColor: 'rgba(255, 206, 86, 1)',
              backgroundColor: 'rgba(255, 206, 86, 0.2)',
              data: []
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'realtime',
              realtime: {
                duration: 60000,
                refresh: 1000,
                delay: 1000
              }
            },
            y: {
              beginAtZero: true
            }
          }
        }
      });
    },
    onDataUpdate: function(data) {
      const now = Date.now();
      this.chartInstance.data.datasets[0].data.push({
        x: now,
        y: data.connectionsCount
      });
      this.chartInstance.update('quiet');
    },
    generateTable: function(table, data) {
      const connectionsCount = data.connectionsCount;
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'Time';
      headerRow.insertCell().textContent = 'Connections';
      const dataRow = table.insertRow();
      dataRow.insertCell().textContent = new Date().toLocaleTimeString();
      dataRow.insertCell().textContent = connectionsCount;
    }
  };
  DataManager.registerModule(connectionsModule, ['connectionsCount']);
  createModuleContainer('connectionsModule', connectionsModule);

  // **************************
  // ASN Top Talkers Module
  // **************************
  const asnModule = {
    chartInstance: null,
    containerId: null, // Will be set by createModuleContainer
    chartContainer: null,
    canvas: null,
    render: function(canvas) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const context = canvas.getContext('2d');
      this.chartInstance = new Chart(context, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Traffic (MB)',
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            data: []
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { beginAtZero: true }
          }
        }
      });
    },
    onDataUpdate: function(data) {
      this.chartInstance.data.labels = data.asnData.map(d => d.asn);
      this.chartInstance.data.datasets[0].data = data.asnData.map(d => d.traffic);
      this.chartInstance.update();
    },
    generateTable: function(table, data) {
      const asnData = data.asnData;
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'ASN';
      headerRow.insertCell().textContent = 'Traffic (MB)';
      asnData.forEach(item => {
        const row = table.insertRow();
        row.insertCell().textContent = item.asn;
        row.insertCell().textContent = item.traffic;
      });
    }
  };
  DataManager.registerModule(asnModule, ['asnData']);
  createModuleContainer('asnModule', asnModule);

  // **************************
  // Top Destination Ports Module
  // **************************
  const portsModule = {
    chartInstance: null,
    containerId: null, // Will be set by createModuleContainer
    chartContainer: null,
    canvas: null,
    render: function(canvas) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const context = canvas.getContext('2d');
      this.chartInstance = new Chart(context, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Connections',
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            data: []
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    },
    onDataUpdate: function(data) {
      this.chartInstance.data.labels = data.portData.map(p => p.port);
      this.chartInstance.data.datasets[0].data = data.portData.map(p => p.connections);
      this.chartInstance.update();
    },
    generateTable: function(table, data) {
      const portData = data.portData;
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'Port';
      headerRow.insertCell().textContent = 'Connections';
      portData.forEach(item => {
        const row = table.insertRow();
        row.insertCell().textContent = item.port;
        row.insertCell().textContent = item.connections;
      });
    }
  };
  DataManager.registerModule(portsModule, ['portData']);
  createModuleContainer('portsModule', portsModule);

  // **************************
  // Host Traffic Rankings Module
  // **************************
  const hostsModule = {
    chartInstance: null,
    containerId: null, // Will be set by createModuleContainer
    chartContainer: null,
    canvas: null,
    render: function(canvas) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const context = canvas.getContext('2d');
      this.chartInstance = new Chart(context, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Bandwidth (MB)',
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            data: []
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: { beginAtZero: true }
          }
        }
      });
    },
    onDataUpdate: function(data) {
      this.chartInstance.data.labels = data.hostData.map(h => h.host);
      this.chartInstance.data.datasets[0].data = data.hostData.map(h => h.bandwidth);
      this.chartInstance.update();
    },
    generateTable: function(table, data) {
      const hostData = data.hostData;
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'Host';
      headerRow.insertCell().textContent = 'Bandwidth (MB)';
      hostData.forEach(item => {
        const row = table.insertRow();
        row.insertCell().textContent = item.host;
        row.insertCell().textContent = item.bandwidth;
      });
    }
  };
  DataManager.registerModule(hostsModule, ['hostData']);
  createModuleContainer('hostsModule', hostsModule);

  // **************************
  // Notifications by Reason Module
  // **************************
  const notificationsModule = {
    chartInstance: null,
    containerId: null, // Will be set by createModuleContainer
    chartContainer: null,
    canvas: null,
    render: function(canvas) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const context = canvas.getContext('2d');
      this.chartInstance = new Chart(context, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Inbound Notifications',
              borderColor: 'rgba(54, 162, 235, 1)',
              data: []
            },
            {
              label: 'Country-Based Notifications',
              borderColor: 'rgba(255, 99, 132, 1)',
              data: []
            },
            {
              label: 'Upload Triggered Notifications',
              borderColor: 'rgba(255, 206, 86, 1)',
              data: []
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'realtime',
              realtime: {
                duration: 60000,
                refresh: 1000,
                delay: 1000
              }
            },
            y: {
              beginAtZero: true
            }
          }
        }
      });
    },
    onDataUpdate: function(data) {
      const now = Date.now();
      this.chartInstance.data.datasets[0].data.push({ x: now, y: data.notifications.inbound });
      this.chartInstance.data.datasets[1].data.push({ x: now, y: data.notifications.countryBased });
      this.chartInstance.data.datasets[2].data.push({ x: now, y: data.notifications.uploadTriggered });
      this.chartInstance.update('quiet');
    },
    generateTable: function(table, data) {
      const notificationsData = data.notifications;
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'Type';
      headerRow.insertCell().textContent = 'Count';
      for (const type in notificationsData) {
        const row = table.insertRow();
        row.insertCell().textContent = type;
        row.insertCell().textContent = notificationsData[type];
      }
    }
  };
  DataManager.registerModule(notificationsModule, ['notifications']);
  createModuleContainer('notificationsModule', notificationsModule);

  // **************************
  // Connection Durations Distribution Module
  // **************************
  const durationsModule = {
    chartInstance: null,
    containerId: null, // Will be set by createModuleContainer
    chartContainer: null,
    canvas: null,
    render: function(canvas) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const context = canvas.getContext('2d');
      this.chartInstance = new Chart(context, {
        type: 'bar',
        data: {
          labels: ['<1s', '1-5s', '5-30s', '30-60s', '>60s'],
          datasets: [
            {
              label: 'Connections',
              backgroundColor: 'rgba(153, 102, 255, 0.6)',
              data: [0, 0, 0, 0, 0]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    },
    onDataUpdate: function(data) {
      this.chartInstance.data.datasets[0].data = data.connectionDurations;
      this.chartInstance.update();
    },
    generateTable: function(table, data) {
      const durationsData = data.connectionDurations;
      const labels = ['<1s', '1-5s', '5-30s', '30-60s', '>60s'];
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'Duration';
      headerRow.insertCell().textContent = 'Connections';
      durationsData.forEach((count, index) => {
        const row = table.insertRow();
        row.insertCell().textContent = labels[index];
        row.insertCell().textContent = count;
      });
    }
  };
  DataManager.registerModule(durationsModule, ['connectionDurations']);
  createModuleContainer('durationsModule', durationsModule);

  // **************************
  // Network Graph Visualization Module
  // **************************
  const networkModule = {
    networkInstance: null,
    containerId: null, // Will be set by createModuleContainer
    chartContainer: null,
    render: function(container) {
      container.innerHTML = '';

      const width = '100%';
      const height = '350px';

      const networkContainer = document.createElement('div');
      networkContainer.style.width = width;
      networkContainer.style.height = height;
      container.appendChild(networkContainer);

      const nodes = new vis.DataSet([{ id: 1, label: 'Router' }]);
      const edges = new vis.DataSet([]);
      const networkData = { nodes: nodes, edges: edges };
      const networkOptions = {
        nodes: {
          shape: 'dot',
          size: 16
        },
        physics: {
          stabilization: false
        }
      };
      this.networkInstance = new vis.Network(networkContainer, networkData, networkOptions);
    },
    onDataUpdate: function(data) {
      const newDataString = JSON.stringify(data.networkGraphData);
      if (newDataString !== this.previousNetworkGraphDataString) {
        this.networkInstance.body.data.nodes.clear();
        this.networkInstance.body.data.edges.clear();
        this.networkInstance.body.data.nodes.add(data.networkGraphData.nodes);
        this.networkInstance.body.data.edges.add(data.networkGraphData.edges);
        this.previousNetworkGraphDataString = newDataString;
      }
    },
    generateTable: function(table, data) {
      const graphData = data.networkGraphData;
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'Node ID';
      headerRow.insertCell().textContent = 'Label';
      graphData.nodes.forEach(node => {
        const row = table.insertRow();
        row.insertCell().textContent = node.id;
        row.insertCell().textContent = node.label;
      });
    },
    previousNetworkGraphDataString: ''
  };
  DataManager.registerModule(networkModule, ['networkGraphData']);
  createModuleContainer('networkModule', networkModule);

   // **************************
  // Top Clients Map Module
  // **************************
  const topClientsMapModule = {
    mapInstance: null,
    arcLayers: [],
    leftContainer: null,
    rightContainer: null,

    render: function(canvas) {
      const container = this.chartContainer;
      container.innerHTML = '';

      // Create subcontainers for client boxes
      this.leftContainer = document.createElement('div');
      this.leftContainer.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        width: 150px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 999;
      `;
      container.appendChild(this.leftContainer);

      this.rightContainer = document.createElement('div');
      this.rightContainer.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        width: 150px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 999;
      `;
      container.appendChild(this.rightContainer);

      // Create map container
      const mapDiv = document.createElement('div');
      mapDiv.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0;';
      container.appendChild(mapDiv);

      if (this.mapInstance) {
        this.mapInstance.remove();
      }

      // Initialize the Leaflet map
      this.mapInstance = Leaflet.map(mapDiv, {
        center: [40, 0],
        zoom: 1,
        minZoom: 1,
        maxZoom: 10,
        zoomControl: true,
        attributionControl: true
      });

      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.mapInstance);

      const resizeObserver = new ResizeObserver(() => {
        this.mapInstance.invalidateSize();
      });
      resizeObserver.observe(container);
    },

    onDataUpdate: function(data) {
      if (!data.topClientsByBandwidth || !Array.isArray(data.topClientsByBandwidth)) {
        return;
      }
      // Clear old arcs and boxes
      this.arcLayers.forEach(layer => layer.remove());
      this.arcLayers = [];
      this.leftContainer.innerHTML = '';
      this.rightContainer.innerHTML = '';

      // Sort clients by bandwidth descending
      const sorted = [...data.topClientsByBandwidth].sort((a, b) => b.bandwidth - a.bandwidth);
      const topFive = sorted.slice(0, 5);

      // Split into left and right for nicer layout
      const leftClients = topFive.slice(0, 3);
      const rightClients = topFive.slice(3);

      // Helper function to create a box
      const createClientBox = (client, container) => {
        const box = document.createElement('div');
        box.style.cssText = `
          background-color: rgba(255,255,255,0.9); /* Slightly transparent white */
          border-radius: 5px;
          padding: 8px;
          font-size: 14px;
          box-shadow: 2px 2px 5px rgba(0,0,0,0.1); /* Subtle shadow */
        `;
        const directionSymbol = client.upload ? '↑' : '↓';
        box.innerHTML = `
          <strong>${client.name}</strong><br/>
          Domain: ${client.domain}<br/>
          Bandwidth: ${client.bandwidth} MB ${directionSymbol}
        `;
        container.appendChild(box);
        return box;
      };

      // Place boxes and draw arcs
      leftClients.forEach((client) => {
        const box = createClientBox(client, this.leftContainer);
        this._drawArcForClient(client, box);
      });
      rightClients.forEach((client) => {
        const box = createClientBox(client, this.rightContainer);
        this._drawArcForClient(client, box);
      });
    },

    _drawArcForClient: function(client, boxElement) {
      const latLng = getCountryLatLng(client.countryCode);
      if (!latLng) return;

      const boxRect = boxElement.getBoundingClientRect();
      const mapRect = this.chartContainer.getBoundingClientRect();

      const boxCenterY = boxRect.top - mapRect.top + boxRect.height / 2;
      const boxStartPoint = {
          x: boxRect.left - mapRect.left + (this.leftContainer.contains(boxElement) ? boxRect.width : 0),
          y: boxCenterY
      };

      const mapEndPoint = this.mapInstance.latLngToContainerPoint(latLng);

      const controlPoint1 = {
          x: boxStartPoint.x + (this.leftContainer.contains(boxElement) ? 50 : -50),
          y: boxCenterY
      };
      const controlPoint2 = {
          x: mapEndPoint.x + (this.leftContainer.contains(boxElement) ? -50 : 50),
          y: mapEndPoint.y - 30
      };

      const curvePoints = [];
      for (let t = 0; t <= 1; t += 0.02) {
          const x = this._bezierPoint(t, boxStartPoint.x, controlPoint1.x, controlPoint2.x, mapEndPoint.x);
          const y = this._bezierPoint(t, boxStartPoint.y, controlPoint1.y, controlPoint2.y, mapEndPoint.y);
          curvePoints.push(this.mapInstance.containerPointToLatLng([x, y]));
      }

      const polyline = Leaflet.polyline(curvePoints, {
          color: 'rgba(0, 102, 204, 0.7)',
          weight: 3,
          dashArray: '5,7',
          opacity: 0.8
      }).addTo(this.mapInstance);
      this.arcLayers.push(polyline);

      const midpointIndex = Math.floor(curvePoints.length / 2);
      const midpointLatLng = curvePoints[midpointIndex];

      // Create a temporary span to measure text width
      const tempSpan = document.createElement('span');
      tempSpan.style.cssText = `
          font-size: 11px;
          white-space: nowrap;
          position: absolute;
          left: -9999px;
          top: -9999px;
      `;
      tempSpan.textContent = `${client.domain} (${client.bandwidth} MB)`;
      document.body.appendChild(tempSpan);
      const textWidth = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);

      const angleRadians = Math.atan2(
          (curvePoints[Math.min(midpointIndex + 1, curvePoints.length - 1)]?.lat || midpointLatLng.lat) - (curvePoints[Math.max(midpointIndex - 1, 0)]?.lat || midpointLatLng.lat),
          (curvePoints[Math.min(midpointIndex + 1, curvePoints.length - 1)]?.lng || midpointLatLng.lng) - (curvePoints[Math.max(midpointIndex - 1, 0)]?.lng || midpointLatLng.lng)
      );
      let angleDegrees = angleRadians * 180 / Math.PI;

      // Adjust for upside-down text
      if (angleDegrees > 90 || angleDegrees < -90) {
          angleDegrees += 180;
      }

      const label = Leaflet.divIcon({
          html: `<div style="
              background: rgba(255,255,255,0.8);
              border: 1px solid rgba(0, 102, 204, 0.5);
              border-radius: 4px;
              padding: 2px 5px;
              font-size: 11px;
              white-space: nowrap;
              transform: rotate(${angleDegrees}deg);
              transform-origin: 50% 50%;
              box-shadow: 1px 1px 3px rgba(0,0,0,0.1);
              width: ${textWidth}px; /* Set width based on text content */
              text-align: center; /* Ensure text is centered within the dynamic width */
          ">
              ${client.domain} (${client.bandwidth} MB)
          </div>`,
          className: 'leaflet-text-along-arc'
      });
      const labelMarker = Leaflet.marker(midpointLatLng, { icon: label }).addTo(this.mapInstance);
      this.arcLayers.push(labelMarker);
  },

    // Function to calculate a point on a Bézier curve
    _bezierPoint: function(t, p0, p1, p2, p3) {
        return (
            Math.pow(1 - t, 3) * p0 +
            3 * Math.pow(1 - t, 2) * t * p1 +
            3 * (1 - t) * Math.pow(t, 2) * p2 +
            Math.pow(t, 3) * p3
        );
    },

    generateTable: function(table, data) {
      const topClients = data.topClientsByBandwidth || [];
      const headerRow = table.insertRow();
      headerRow.insertCell().textContent = 'Client';
      headerRow.insertCell().textContent = 'Domain';
      headerRow.insertCell().textContent = 'Country Code';
      headerRow.insertCell().textContent = 'Bandwidth (MB)';
      headerRow.insertCell().textContent = 'Direction';

      topClients.forEach(item => {
        const row = table.insertRow();
        row.insertCell().textContent = item.name;
        row.insertCell().textContent = item.domain;
        row.insertCell().textContent = item.countryCode;
        row.insertCell().textContent = item.bandwidth;
        row.insertCell().textContent = item.upload ? 'Up' : 'Down';
      });
    }
  };
  DataManager.registerModule(topClientsMapModule, ['topClientsByBandwidth']);
  createModuleContainer('topClientsMapModule', topClientsMapModule);

  // Simulate receiving data every second
  setInterval(() => {
    const newData = {
      bandwidth: {
        upload: Math.random() * 10 + 5,
        download: Math.random() * 15 + 10
      },
      connectionsByCountry: [
        {
          country: 'US',
          connections: Math.floor(Math.random() * 100),
          bandwidth: Math.floor(Math.random() * 5000)
        },
        {
          country: 'DE',
          connections: Math.floor(Math.random() * 100),
          bandwidth: Math.floor(Math.random() * 5000)
        },
        {
          country: 'FR',
          connections: Math.floor(Math.random() * 100),
          bandwidth: Math.floor(Math.random() * 5000)
        },
        {
          country: 'JP',
          connections: Math.floor(Math.random() * 100),
          bandwidth: Math.floor(Math.random() * 5000)
        },
        {
          country: 'IN',
          connections: Math.floor(Math.random() * 100),
          bandwidth: Math.floor(Math.random() * 5000)
        }
      ],
      topDomains: [
        { domain: 'example.com', connections: Math.floor(Math.random() * 200), bandwidth: Math.floor(Math.random() * 3000) },
        { domain: 'anotherdomain.net', connections: Math.floor(Math.random() * 200), bandwidth: Math.floor(Math.random() * 3000) },
        { domain: 'somesite.org', connections: Math.floor(Math.random() * 200), bandwidth: Math.floor(Math.random() * 3000) }
      ],
      dnsRequests: Math.floor(Math.random() * 50 + 20),
      protocolBandwidth: {
        'HTTP': Math.random() * 50 + 10,
        'HTTPS': Math.random() * 50 + 10,
        'FTP': Math.random() * 50 + 10
      },
      trafficPie: {
        incoming: Math.floor(Math.random() * 100),
        outgoing: Math.floor(Math.random() * 100)
      },
      connectionsCount: Math.floor(Math.random() * 100),
      asnData: [
        { asn: 'AS15169', traffic: Math.floor(Math.random() * 3000) },
        { asn: 'AS13335', traffic: Math.floor(Math.random() * 3000) },
        { asn: 'AS16509', traffic: Math.floor(Math.random() * 3000) }
      ],
      portData: [
        { port: 80, connections: Math.floor(Math.random() * 300) },
        { port: 443, connections: Math.floor(Math.random() * 300) },
        { port: 22, connections: Math.floor(Math.random() * 300) }
      ],
      hostData: [
        { host: 'Laptop', bandwidth: Math.floor(Math.random() * 2000) },
        { host: 'SmartTV', bandwidth: Math.floor(Math.random() * 2000) },
        { host: 'NAS', bandwidth: Math.floor(Math.random() * 2000) }
      ],
      notifications: {
        inbound: Math.floor(Math.random() * 10),
        countryBased: Math.floor(Math.random() * 10),
        uploadTriggered: Math.floor(Math.random() * 10)
      },
      connectionDurations: [
        Math.floor(Math.random() * 50),
        Math.floor(Math.random() * 50),
        Math.floor(Math.random() * 50),
        Math.floor(Math.random() * 50),
        Math.floor(Math.random() * 50)
      ],
      networkGraphData: {
        nodes: [
          { id: 1, label: 'Router' },
          { id: 2, label: 'example.com' },
          { id: 3, label: 'anotherdomain.net' },
          { id: 4, label: 'somesite.org' }
        ],
        edges: [
          { from: 1, to: 2 },
          { from: 1, to: 3 }, // Added missing colon after 'to'
          { from: 1, to: 4 }
        ]
      },
      topClientsByBandwidth: [
        { name: 'Client A', domain: 'example.com', bandwidth: Math.floor(Math.random() * 100), upload: true, countryCode: 'US' },
        { name: 'Client B', domain: 'another.net', bandwidth: Math.floor(Math.random() * 100), upload: false, countryCode: 'DE' },
        { name: 'Client C', domain: 'third.org', bandwidth: Math.floor(Math.random() * 100), upload: true, countryCode: 'FR' },
        { name: 'Client D', domain: 'fourth.com', bandwidth: Math.floor(Math.random() * 100), upload: false, countryCode: 'JP' },
        { name: 'Client E', domain: 'fifth.net', bandwidth: Math.floor(Math.random() * 100), upload: true, countryCode: 'IN' }
      ],
    };
    DataManager.updateData(newData);
  }, 1000);
});
