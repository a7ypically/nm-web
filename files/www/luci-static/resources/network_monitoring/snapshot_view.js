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

const formatBytes = bytes => (bytes / (1024 * 1024)).toFixed(2);
const formatDigits = bytes => (typeof bytes === 'string') ? bytes : bytes.toFixed(2);
const formatDuration = (ms, connections) => {
  ms /= connections;
  // format to hh:mm:ss
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
  
  // Move all code inside a DOMContentLoaded event listener
  document.addEventListener('DOMContentLoaded', function() {
    // Add connection mode state
    let currentConnectionMode = 'clients'; // Default mode

    // Mode selector event listeners
    const titleSelector = document.querySelector('.page-title-selector');
    const titleText = document.querySelector('.title-text');
    const modeOptions = document.querySelectorAll('.mode-option');

    // Handle click outside to close dropdown
    document.addEventListener('click', function(event) {
      if (!titleSelector.contains(event.target)) {
        titleSelector.classList.remove('open');
      }
    });

    // Toggle dropdown
    titleSelector.querySelector('.selected-mode').addEventListener('click', function(event) {
      event.stopPropagation();
      titleSelector.classList.toggle('open');
    });

    // Handle mode selection
    modeOptions.forEach(option => {
      option.addEventListener('click', function(event) {
        event.stopPropagation();
        
        // Update selected state
        modeOptions.forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        
        // Update current mode and title
        currentConnectionMode = this.dataset.mode;
        titleText.textContent = this.textContent;
        
        // Close dropdown
        setTimeout(() => {
          titleSelector.classList.remove('open');
        }, 50);
        
        // Refresh data with new mode
        fetchAndUpdateData();
      });
    });

    // Global DataManager object
    const DataManager = {
      data: {},
      modules: [],
      registerModule: function(module) {
        this.modules.push(module);
      },
      updateData: function(newData) {
        this.data = newData;
        // Call all modules with the raw data
        this.modules.forEach(module => {
          module.onDataUpdate(newData);
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
  
      // Create expand button only if not trafficPieModule
      if (moduleId !== 'trafficPieModule') {
        const expandButton = document.createElement('button');
        expandButton.className = 'expand-button';
        expandButton.setAttribute('title', 'Expand view');
        expandButton.onclick = function(e) {
          e.stopPropagation();
          
          // Create loading overlay with spinner
          const loadingOverlay = document.createElement('div');
          loadingOverlay.className = 'loading-overlay';
          
          const spinner = document.createElement('div');
          spinner.className = 'loading-spinner';
          loadingOverlay.appendChild(spinner);
          
          moduleStructure.appendChild(loadingOverlay);
          
          // Disable the expand button while loading
          expandButton.disabled = true;
          
          // Use setTimeout to ensure loading spinner is visible before heavy operation
          setTimeout(() => {
            openOverlay(module, loadingOverlay, expandButton);
          }, 0);
        };
        moduleStructure.appendChild(expandButton);
      }
  
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
    function openOverlay(module, loadingOverlay, expandButton) {
      console.log('Starting to open overlay');
      
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
      //tableContainer.appendChild(table);
      
      // Add elements to content and popup
      content.appendChild(chartWrapper);
      content.appendChild(tableContainer);
      popup.appendChild(content);
      overlay.appendChild(popup);
      
      // Generate initial table data
      if (module.generateTable) {
        module.generateTable(tableContainer, DataManager.data);
      }
      
      // Store table reference for updates
      module.popupTable = table;
      
      // Update the module's onDataUpdate to also update table
      const originalOnDataUpdate = module.onDataUpdate;
      module.onDataUpdate = function(data) {
        originalOnDataUpdate.call(this, data);
        if (this.popupTable && this.generateTable) {
          while (this.popupTable.rows.length > 0) {
            this.popupTable.deleteRow(0);
          }
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
        
        // Resize chart after moving back
        if (module.chartInstance) {
          requestAnimationFrame(() => {
            module.chartInstance.resize();
          });
        }
      };
      
      closeButton.onclick = (e) => {
        e.stopPropagation();
        handleClose();
      };
      overlay.onclick = handleClose;
      popup.onclick = (e) => e.stopPropagation();
      
      // Add to body
      document.body.appendChild(overlay);
      
      // Remove loading overlay and re-enable button
      if (loadingOverlay && loadingOverlay.parentNode) {
        loadingOverlay.remove();
      }
      if (expandButton) {
        expandButton.disabled = false;
      }
      
      // Resize chart after moving to popup
      if (module.chartInstance) {
        requestAnimationFrame(() => {
          module.chartInstance.resize();
        });
      }
    }
  
        // Update the normalizeTableData function
    function normalizeTableData(data) {
      if (!data) return [];
      
      // If data is already an array, format its numeric values
      if (Array.isArray(data)) {
        return data.map(item => {
          const formattedItem = {...item};
          Object.keys(item).forEach(key => {
            formattedItem[key] = formatValue(item[key], key);
          });
          return formattedItem;
        });
      }
      
      // If data is an object with connectionsByCountry
      if (data.connectionsByCountry) {
        return data.connectionsByCountry.map(item => ({
          ...item,
          bandwidth: formatValue(item.bandwidth, 'bandwidth'),
          connections: formatValue(item.connections, 'connections')
        }));
      }
      
      // If data is an object with topDomains
      if (data.topDomains) {
        return data.topDomains.map(item => ({
          ...item,
          bandwidth: formatValue(item.bandwidth, 'bandwidth'),
          incoming: formatValue(item.incoming, 'incoming'),
          outgoing: formatValue(item.outgoing, 'outgoing'),
          connections: formatValue(item.connections, 'connections')
        }));
      }
      
      // If data is a simple object, convert to array
      if (typeof data === 'object' && !Array.isArray(data)) {
        if (data.protocolBandwidth) {
          return Object.entries(data.protocolBandwidth).map(([protocol, bandwidth]) => ({
            protocol,
            bandwidth: formatValue(bandwidth, 'bandwidth')
          }));
        }
        
        if (data.notifications) {
          return Object.entries(data.notifications).map(([type, count]) => ({
            type,
            count: formatValue(count, 'count')
          }));
        }
        
        // For other object types, convert to array of key-value pairs
        return Object.entries(data).map(([key, value]) => ({
          key,
          value: formatValue(value, key)
        }));
      }
      
      return [];
    }

    // Update the sortTable function
    function sortTable(table, field) {
      const tbody = table.querySelector('tbody');
      const direction = table._sortDirection;
      
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const sortedRows = rows.sort((rowA, rowB) => {
        const cellA = rowA.querySelector(`td[data-field="${field}"]`);
        const cellB = rowB.querySelector(`td[data-field="${field}"]`);
        
        const valueA = cellA ? cellA.textContent : '';
        const valueB = cellB ? cellB.textContent : '';
        
        return direction === 'asc' 
            ? compareValues(valueA, valueB, field)
            : compareValues(valueB, valueA, field);
      });
      
      // Clear the tbody
      while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
      }
      
      // Add sorted rows
      sortedRows.forEach(row => tbody.appendChild(row));
    }

    // Update renderTableData function
    function renderTableData(table, columns) {
      const tbody = table.querySelector('tbody');
      // Clear existing rows
      tbody.innerHTML = '';
      
      // Add data rows
      table._data.forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(column => {
          const td = document.createElement('td');
          td.textContent = column.format ? column.format(row[column.field]) : formatValue(row[column.field], column.field);
          //td.textContent = formatValue(row[column.field], column.field);
          td.setAttribute('data-field', column.field);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      
      // Apply initial sort if set
      if (table._sortField) {
        sortTable(table, table._sortField);
      }
    }

    // Function to format numeric values
    function formatValue(value, field) {
      if (typeof value === 'undefined' || value === null) return '';
      
      // Convert field to lowercase for case-insensitive comparison
      const loweredField = field.toLowerCase();
      
      // List of fields that should be treated as numbers with 2 decimal places
      const numericFields = ['bandwidth', 'upload', 'download', 'incoming', 'outgoing', 'traffic', 'total'];
      
      if (numericFields.some(f => loweredField.includes(f))) {
        const num = parseFloat(value);
        return isNaN(num) ? value : num.toFixed(2);
      }
      
      // Handle integer fields
      const integerFields = ['connections', 'count', 'dnsRequests'];
      if (integerFields.some(f => loweredField.includes(f))) {
        const num = parseInt(value);
        return isNaN(num) ? value : num;
      }
      
      return value;
    }

    // Function to compare values for sorting
    function compareValues(a, b, field) {
      const aValue = a;
      const bValue = b;
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      // List of fields that should be sorted numerically
      const numericFields = ['bandwidth', 'upload', 'download', 'incoming', 'outgoing', 'traffic', 'connections', 'count', 'dnsRequests'];
      
      if (numericFields.includes(field)) {
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        
        // Handle NaN values
        if (isNaN(aNum)) return 1;
        if (isNaN(bNum)) return -1;
        if (isNaN(aNum) && isNaN(bNum)) return 0;
        
        return aNum - bNum;
      }
      
      // Default string comparison
      return String(aValue).localeCompare(String(bValue), undefined, {numeric: true});
    }

    // Generic data grouping function
    function groupData(data, groupBy, aggregates) {
      if (!data || !Array.isArray(data)) return [];
      
      const groups = new Map();
      
      data.forEach((row, index) => {
        // Create group key based on groupBy fields
        const groupKey = groupBy.map(field => row[field]).join('|');
        
        if (!groups.has(groupKey)) {
          const groupRow = {};
          // Add groupBy fields to the group row
          groupBy.forEach(field => {
            groupRow[field] = row[field];
          });
          // Initialize aggregates
          Object.keys(aggregates).forEach(field => {
            groupRow[field] = null;
          });
          // Initialize source indexes array
          groupRow.sourceIndexes = [];
          groups.set(groupKey, groupRow);
        }
        
        // Update aggregates for the group
        const groupRow = groups.get(groupKey);
        Object.entries(aggregates).forEach(([field, aggType]) => {
          switch (aggType) {
            case 'sum':
              groupRow[field] += (parseFloat(row[field]) || 0);
              break;
            case 'count':
              groupRow[field]++;
              break;
            case 'first':
              if (groupRow[field] === null) {
                groupRow[field] = row[field];
              }
            // Add more aggregate types as needed
          }
        });
        // Add index to source indexes array
        groupRow.sourceIndexes.push(index);
      });
      
      return Array.from(groups.values());
    }

    // Function to show detailed data in a popup
    function showDetailedDataPopup(sourceIndexes, title) {
      // Create popup container
      const popup = document.createElement('div');
      popup.className = 'detailed-data-popup';
      
      // Create modal container
      const modal = document.createElement('div');
      modal.className = 'detailed-data-modal';
      
      // Create modal header
      const header = document.createElement('div');
      header.className = 'modal-header';
      
      // Add title
      const titleElement = document.createElement('h3');
      titleElement.textContent = title;
      header.appendChild(titleElement);
      
      // Add close button
      const closeButton = document.createElement('button');
      closeButton.className = 'close-button';
      closeButton.textContent = '×';
      closeButton.onclick = () => popup.remove();
      header.appendChild(closeButton);
      
      modal.appendChild(header);
      
      // Create modal body
      const body = document.createElement('div');
      body.className = 'modal-body';
      
      // Process raw data rows using the same format as clusterMapModule
      const processedData = sourceIndexes.map(index => {
        const row = window.rawData[index];
        return {
          family: row[window.rawDataColIndex.family] || 0,
          proto: row[window.rawDataColIndex.proto] || '',
          mac: row[window.rawDataColIndex.mac] || '',
          ip: row[window.rawDataColIndex.ip] || '',
          clientName: row[window.rawDataColIndex.clientName] || '',
          port: row[window.rawDataColIndex.port] || '',
          protocol: row[window.rawDataColIndex.protocol] || '',
          direction: row[window.rawDataColIndex.direction] || '',
          asn: row[window.rawDataColIndex.asn] || '',
          country: row[window.rawDataColIndex.country] || 'Unknown',
          connections: row[window.rawDataColIndex.connections] || 1,
          rxBytes: formatBytes(row[window.rawDataColIndex.rxBytes] || 0),
          rxPackets: row[window.rawDataColIndex.rxPackets] || 0,
          txBytes: formatBytes(row[window.rawDataColIndex.txBytes] || 0), 
          txPackets: row[window.rawDataColIndex.txPackets] || 0,
          duration: formatDuration(row[window.rawDataColIndex.duration] || 0, row[window.rawDataColIndex.connections] || 1),
          domain: row[window.rawDataColIndex.domain] || '',
          hosts: row[window.rawDataColIndex.hosts] || '',
          lastExtAddr: row[window.rawDataColIndex.lastExtAddr] || ''
        };
      });
      
      // Use the same columns as clusterMapModule
      const columns = [
        { field: 'family', label: 'Family' },
        { field: 'proto', label: 'IP Proto' },
        { field: 'mac', label: 'MAC' },
        { field: 'ip', label: 'IP' },
        { field: 'clientName', label: 'Client' },
        { field: 'port', label: 'Port' },
        { field: 'protocol', label: 'Protocol' },
        { field: 'direction', label: 'Direction' },
        { field: 'asn', label: 'ASN' },
        { field: 'country', label: 'Country' },
        { field: 'connections', label: 'Connections' },
        { field: 'rxBytes', label: 'RX (MB)' },
        { field: 'rxPackets', label: 'RX Packets' },
        { field: 'txBytes', label: 'TX (MB)' },
        { field: 'txPackets', label: 'TX Packets' },
        { field: 'duration', label: 'Duration (avg)' },
        { field: 'domain', label: 'Domain' },
        { field: 'hosts', label: 'Hosts' },
        { field: 'lastExtAddr', label: 'Last Ext Addr' }
      ];
      
      const enhancedTable = createEnhancedTable(processedData, columns);
      body.appendChild(enhancedTable);
      
      modal.appendChild(body);
      popup.appendChild(modal);
      document.body.appendChild(popup);
      
      // Add click outside to close
      popup.addEventListener('click', (e) => {
        if (e.target === popup) {
          popup.remove();
        }
      });
    }

    // Update createEnhancedTable function to add click handlers
    function createEnhancedTable(data, columns) {
      // Create a container div for the table
      const container = document.createElement('div');
      container.className = 'table-container';
      container.style.maxHeight = '400px';
      container.style.overflowY = 'auto';
      
      const table = document.createElement('table');
      table.className = 'data-table';
      
      // Create table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      // Store the original data and current sort state
      table._data = normalizeTableData(data);
      table._sortField = '';
      table._sortDirection = 'desc';
      
      columns.forEach(column => {
        const th = document.createElement('th');
        // Add a space before the sort indicator to ensure proper spacing
        th.innerHTML = `${column.label || column.field} <span class="sort-indicator"></span>`;
        th.setAttribute('data-field', column.field);
        
        th.onclick = () => {
            const currentSortField = table._sortField;
            const currentSortDirection = table._sortDirection;
            
            // Reset all headers
            headerRow.querySelectorAll('th').forEach(header => {
                header.removeAttribute('data-sort');
            });
      
            // Update sort direction
            if (currentSortField === column.field) {
                table._sortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                table._sortDirection = 'desc';
                table._sortField = column.field;
            }
            
            // Update sort indicator
            th.setAttribute('data-sort', table._sortDirection);
            
            // Sort the table
            sortTable(table, column.field);
        };
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    
    // Initial render of data
    renderTableData(table, columns);
        
    // Add click handler to table rows
    tbody.querySelectorAll('tr').forEach((row, index) => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
          // Check if the row has source indexes
        if (data[index] && data[index].sourceIndexes) {
          const title = columns.map(col => 
            `${col.label}: ${formatValue(data[index][col.field], col.field)}`
          ).join(' | ');
          // FIXME title is broken because of the bytes conversion mess
          showDetailedDataPopup(data[index].sourceIndexes, 'Detailed connections view');
          }
        });
      });
      
      container.appendChild(table);
      return container;
    }

    // Function to format bytes to GB with 2 decimal places
    function formatBytesToGB(bytes) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    // **************************
    // Incoming vs Outgoing Traffic Module
    // **************************
    const trafficPieModule = {
      chartInstance: null,
      groupConfig: {
        groupBy: ['direction'],
        aggregates: {
          bytes: 'sum'
        }
      },
      
      processData: function(data) {
        if (!data || !data.rawData || !data.rawDataColIndex) return [];
        
        const colIdx = data.rawDataColIndex;
        let incoming = 0;
        let outgoing = 0;
        
        data.rawData.forEach(row => {
          incoming += (row[colIdx.rxBytes] || 0);
          outgoing += (row[colIdx.txBytes] || 0);
        });
        
        // Keep the raw bytes values for the chart
        return [
          { direction: 'incoming', bytes: incoming },
          { direction: 'outgoing', bytes: outgoing }
        ];
      },
      
      render: function(canvas) {
        if (this.chartInstance) {
          this.chartInstance.destroy();
        }

        const context = canvas.getContext('2d');
        this.chartInstance = new Chart(context, {
          type: 'pie',
          data: {
            labels: ['Incoming', 'Outgoing'],
            datasets: [{
              data: [0, 0],
              backgroundColor: [
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 99, 132, 0.8)'
              ],
              borderColor: [
                'rgba(54, 162, 235, 1)',
                'rgba(255, 99, 132, 1)'
              ],
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
              padding: {
                top: 20,
                bottom: 20,
                left: 20,
                right: 20
              }
            },
            plugins: {
              title: {
                display: true,
                text: 'Incoming vs Outgoing Traffic',
                font: {
                  size: 16,
                  weight: 'bold'
                },
                padding: 20
              },
              legend: {
                position: 'bottom',
                labels: {
                  padding: 20,
                  font: {
                    size: 14
                  }
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `${context.label}: ${formatBytesToGB(context.raw)}`;
                  }
                }
              }
            }
          },
          plugins: [ChartDataLabels, {
            id: 'customCanvasBackgroundColor',
            beforeDraw: (chart) => {
              const ctx = chart.canvas.getContext('2d');
              ctx.save();
              ctx.globalCompositeOperation = 'destination-over';
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, chart.width, chart.height);
              ctx.restore();
            }
          }],
          options: {
            plugins: {
              datalabels: {
                color: '#fff',
                font: {
                  weight: 'bold',
                  size: 14
                },
                formatter: function(value) {
                  return formatBytesToGB(value);
                },
                anchor: 'center',
                align: 'center',
                offset: 0
              }
            }
          }
        });
      },
      
      onDataUpdate: function(data) {
        this.processedData = this.processData(data);
        const incoming = this.processedData.find(d => d.direction === 'incoming')?.bytes || 0;
        const outgoing = this.processedData.find(d => d.direction === 'outgoing')?.bytes || 0;
        
        this.chartInstance.data.datasets[0].data = [incoming, outgoing];
        this.chartInstance.update();
      },

      generateTable: function(table, data) {
        const processedData = this.processedData;
        
        const columns = [
          { field: 'direction', label: 'Type' },
          { field: 'bytes', label: 'Value (GB)', format: formatBytesToGB }
        ];
        
        const enhancedTable = createEnhancedTable(processedData, columns);
        table.appendChild(enhancedTable);
      }
    };
    DataManager.registerModule(trafficPieModule, ['rawData', 'rawDataColIndex']);
    createModuleContainer('trafficPieModule', trafficPieModule);

    // **************************
    // Connections by Country Module
    // **************************
    const mapModule = {
      mapInstance: null,
      circles: {},
      groupConfig: {
        groupBy: ['country'],
        aggregates: {
          connections: 'sum',
          rxBytes: 'sum',
          txBytes: 'sum',
          lonlat: 'first'
        }
      },
      
      processData: function(data) {
        if (!data || !data.rawData || !data.rawDataColIndex) return [];
        
        const colIdx = data.rawDataColIndex;
        const processedData = data.rawData.map(row => ({
          country: row[colIdx.country] || 'Unknown',
          connections: row[colIdx.connections] || 1,
          rxBytes: row[colIdx.rxBytes] || 0,
          txBytes: row[colIdx.txBytes] || 0,
          lonlat: row[colIdx.lonlat]
        }));
        
        const groupedData = groupData(processedData, this.groupConfig.groupBy, this.groupConfig.aggregates);
        
        return groupedData.map(group => ({
          ...group,
          bandwidth: (group.rxBytes + group.txBytes) / (1024 * 1024) // Convert to MB
        }));
      },
      
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
        this.processedData = this.processData(data);
        this.updateMap(this.processedData);
      },
      updateMap: function(data) {
        if (!data || !this.mapInstance) return;
        
        // Update existing circles and create new ones
        data.forEach(countryData => {
          if (!countryData.lonlat || countryData.lonlat.length !== 2) return;
          
          let circle = this.circles[countryData.country];
          
          if (circle) {
            // Animate radius change
            const startRadius = circle.getRadius();
            const endRadius = countryData.connections;
            animateCircleRadius(circle, startRadius, endRadius, 500);
            // Update popup content
            circle.getPopup().setContent(`
              <strong>${countryData.country}</strong><br>
              Connections: ${countryData.connections}<br>
              Bandwidth: ${countryData.bandwidth.toFixed(2)} MB`);
          } else {
            // Create new circle
            circle = Leaflet.circle(countryData.lonlat, {
              color: 'red',
              radius: countryData.connections
            }).addTo(this.mapInstance);
            circle.bindPopup(`
              <strong>${countryData.country}</strong><br>
              Connections: ${countryData.connections}<br>
              Bandwidth: ${countryData.bandwidth.toFixed(2)} MB`);
            this.circles[countryData.country] = circle;
          }
        });
        
        // Remove circles for countries no longer in the data
        Object.keys(this.circles).forEach(country => {
          if (!data.find(d => d.country === country)) {
            this.circles[country].remove();
            delete this.circles[country];
          }
        });
      },
      generateTable: function(table, data) {
        const processedData = this.processedData;
        
        const columns = [
          { field: 'country', label: 'Country' },
          { field: 'connections', label: 'Connections', format: value => value.toLocaleString() },
          { field: 'rxBytes', label: 'Incoming (MB)', format: formatBytes },
          { field: 'txBytes', label: 'Outgoing (MB)', format: formatBytes },
          { field: 'bandwidth', label: 'Total (MB)' }
        ];
        
        const enhancedTable = createEnhancedTable(processedData, columns);
        table.appendChild(enhancedTable);
      }
    };
    DataManager.registerModule(mapModule, ['rawData', 'rawDataColIndex']);
    createModuleContainer('mapModule', mapModule);
  
    // **************************
    // Connections cluster map Module
    // **************************
    const clusterMapModule = {
      mapInstance: null,
      markerClusterGroup: null,
      render: function(canvas) {
        // Luci and Leaflet collision and MarkerClusterGroup can not seem to work with L.noConflict
        L = Leaflet;
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
    
        // Create marker cluster group
        this.markerClusterGroup = MarkerClusterGroup({
          iconCreateFunction: function(cluster) {
            // Calculate total connections in this cluster
            const markers = cluster.getAllChildMarkers();
            const totalConnections = markers.reduce((sum, marker) => sum + (marker.connections || 1), 0);
            
            // Create custom icon with connections count
            return Leaflet.divIcon({
              html: '<div><span>' + totalConnections + '</span></div>',
              className: 'marker-cluster marker-cluster-large',
              iconSize: Leaflet.point(40, 40)
            });
          },
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: true,
          zoomToBoundsOnClick: true,
          animate: true
        });
        
        this.mapInstance.addLayer(this.markerClusterGroup);

        // Add event listeners for map movement and zoom
        this.mapInstance.on('moveend zoomend', () => {
          this.updateTableWithVisibleMarkers();
        });

        const resizeObserver = new ResizeObserver(() => {
          this.mapInstance.invalidateSize();
        });
        
        resizeObserver.observe(container);
  
        if (DataManager.data.rawData) {
          this.updateMap(DataManager.data);
        }
      },
      onDataUpdate: function(data) {
        this.updateMap(data);
      },
      updateMap: function(data) {
        if (!data || !data.rawData || !this.mapInstance) return;

        this.data = data;
        
        // Clear existing markers
        this.markerClusterGroup.clearLayers();
        
        // Process each row of raw data
        data.rawData.forEach((row, index) => {
          const lonlat = row[data.rawDataColIndex.lonlat];
          if (!lonlat || lonlat.length !== 2) return;
          
          const connections = row[data.rawDataColIndex.connections] || 1;
          const rxBytes = row[data.rawDataColIndex.rxBytes] || 0;
          const txBytes = row[data.rawDataColIndex.txBytes] || 0;
          const bandwidth = formatBytes(rxBytes + txBytes);
          const country = row[data.rawDataColIndex.country] || 'Unknown';
          const protocol = row[data.rawDataColIndex.protocol] || '';
          const port = row[data.rawDataColIndex.port] || '';
          const hosts = row[data.rawDataColIndex.hosts] || '';
          
          // Create marker for this connection
          const marker = Leaflet.circleMarker(lonlat, {
            radius: Math.min(10, Math.max(5, Math.log2(connections + 1) * 2)),
            fillColor: '#ff4444',
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
          });
          
          // Store connections count on marker for cluster calculations
          marker.connections = connections;
          marker.rowData = row;
          
          marker.bindPopup(`
            <strong>${country}</strong><br>
            Protocol: ${protocol}<br>
            Port: ${port}<br>
            Host: ${hosts}<br>
            Connections: ${connections}<br>
            Bandwidth: ${bandwidth} MB`);
          
          this.markerClusterGroup.addLayer(marker);
        });
        
        // Fit bounds if we have markers
        if (this.markerClusterGroup.getLayers().length > 0) {
          this.mapInstance.fitBounds(this.markerClusterGroup.getBounds());
        }

        // Update table with initial visible markers
        this.updateTableWithVisibleMarkers();
      },
      updateTableWithVisibleMarkers: function() {
        if (!this.mapInstance) return;

        const bounds = this.mapInstance.getBounds();
        const visibleMarkers = [];
        
        // Get all markers (including those in clusters)
        this.markerClusterGroup.getLayers().forEach(marker => {
          const latLng = marker.getLatLng();
          if (bounds.contains(latLng)) {
            visibleMarkers.push(marker.rowData);
          }
        });

        // Update the table with visible markers' data
        const popupTableDiv = document.querySelector('.popup-table');
        if (!popupTableDiv) return;

        // Clear existing table
        popupTableDiv.innerHTML = '';
        
        this.generateTable(popupTableDiv, {
          rawData: visibleMarkers,
          rawDataColIndex: this.data.rawDataColIndex
        });
      },
      generateTable: function(table, data) {
        if (!data || !data.rawData) return;
        
        // Process raw data rows
        const processedData = data.rawData.map(row => ({
          family: row[data.rawDataColIndex.family] || 0,
          proto: row[data.rawDataColIndex.proto] || '',
          mac: row[data.rawDataColIndex.mac] || '',
          ip: row[data.rawDataColIndex.ip] || '',
          clientName: row[data.rawDataColIndex.clientName] || '',
          port: row[data.rawDataColIndex.port] || '',
          protocol: row[data.rawDataColIndex.protocol] || '',
          direction: row[data.rawDataColIndex.direction] || '',
          asn: row[data.rawDataColIndex.asn] || '',
          country: row[data.rawDataColIndex.country] || 'Unknown',
          connections: row[data.rawDataColIndex.connections] || 1,
          rxBytes: formatBytes(row[data.rawDataColIndex.rxBytes] || 0), // Convert to MB
          rxPackets: row[data.rawDataColIndex.rxPackets] || 0,
          txBytes: formatBytes(row[data.rawDataColIndex.txBytes] || 0), // Convert to MB
          txPackets: row[data.rawDataColIndex.txPackets] || 0,
          duration: formatDuration(row[data.rawDataColIndex.duration] || 0, row[data.rawDataColIndex.connections] || 1),
          domain: row[data.rawDataColIndex.domain] || '',
          hosts: row[data.rawDataColIndex.hosts] || '',
          lastExtAddr: row[data.rawDataColIndex.lastExtAddr] || ''
        }));
        
        const columns = [
          { field: 'family', label: 'Family' },
          { field: 'proto', label: 'IP Proto' },
          { field: 'mac', label: 'MAC' },
          { field: 'ip', label: 'IP' },
          { field: 'clientName', label: 'Client' },
          { field: 'port', label: 'Port' },
          { field: 'protocol', label: 'Protocol' },
          { field: 'direction', label: 'Direction' },
          { field: 'asn', label: 'ASN' },
          { field: 'country', label: 'Country' },
          { field: 'connections', label: 'Connections' },
          { field: 'rxBytes', label: 'RX (MB)' },
          { field: 'rxPackets', label: 'RX Packets' },
          { field: 'txBytes', label: 'TX (MB)' },
          { field: 'txPackets', label: 'TX Packets' },
          { field: 'duration', label: 'Duration (avg)' },
          { field: 'domain', label: 'Domain' },
          { field: 'hosts', label: 'Hosts' },
          { field: 'lastExtAddr', label: 'Last Ext Addr' }
        ];
        
        const enhancedTable = createEnhancedTable(processedData, columns);
        table.appendChild(enhancedTable);
      }
    };
    DataManager.registerModule(clusterMapModule, ['rawData', 'rawDataColIndex']);
    createModuleContainer('clusterMapModule', clusterMapModule);
  
    // **************************
    // Top Domains Module
    // **************************
    const domainsModule = {
      chart: null,
      groupConfig: {
        groupBy: ['domain'],
        aggregates: {
          connections: 'sum',
          incoming: 'sum',
          outgoing: 'sum',
          bandwidth: 'sum'
        }
      },
      
      processData: function(data) {
        if (!data || !data.rawData || !data.rawDataColIndex) return [];
        
        const colIdx = data.rawDataColIndex;
        const processedData = data.rawData.map(row => ({
          domain: row[colIdx.domain] || '',
          connections: row[colIdx.connections] || 1,
          incoming: (row[colIdx.rxBytes] || 0) / (1024 * 1024), // Convert to MB
          outgoing: (row[colIdx.txBytes] || 0) / (1024 * 1024), // Convert to MB
          bandwidth: ((row[colIdx.rxBytes] || 0) + (row[colIdx.txBytes] || 0)) / (1024 * 1024)
        }));
        
        return groupData(processedData, this.groupConfig.groupBy, this.groupConfig.aggregates)
          .sort((a, b) => b.bandwidth - a.bandwidth);
      },
      
      render: function(canvas) {
        const ctx = canvas.getContext('2d');
        this.chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: [],
            datasets: [
              {
                label: 'Incoming Traffic (MB)',
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                data: []
              },
              {
                label: 'Outgoing Traffic (MB)',
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                data: []
              }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Top Domains by Bandwidth'
              },
              tooltip: {
                callbacks: {
                  afterTitle: function(context) {
                    const domain = context[0].dataset.domains[context[0].dataIndex];
                    return `Connections: ${domain.connections}`;
                  }
                }
              }
            },
            scales: {
              x: { 
                stacked: true
              },
              y: {
                stacked: true
              }
            }
          }
        });
      },

      onDataUpdate: function(data) {
        if (!this.chart) return;
        
        this.processedData = this.processData(data);
        const chartData = this.processedData.slice(0, 10) // Only top 10 for chart
        
        this.chart.data.labels = chartData.map(d => d.domain);
        
        // Update incoming traffic dataset
        this.chart.data.datasets[0].data = chartData.map(d => d.incoming);
        this.chart.data.datasets[0].domains = chartData;
        
        // Update outgoing traffic dataset
        this.chart.data.datasets[1].data = chartData.map(d => d.outgoing);
        this.chart.data.datasets[1].domains = chartData;
        
        this.chart.update();
      },

      generateTable: function(table, data) {
        const processedData = this.processedData; // Use all data for table
        
        const columns = [
          { field: 'domain', label: 'Domain' },
          { field: 'connections', label: 'Connections' },
          { field: 'incoming', label: 'Incoming (MB)' },
          { field: 'outgoing', label: 'Outgoing (MB)' },
          { field: 'bandwidth', label: 'Total (MB)' }
        ];
        
        const enhancedTable = createEnhancedTable(processedData, columns);
        table.appendChild(enhancedTable);
      }
    };
    DataManager.registerModule(domainsModule, ['rawData', 'rawDataColIndex']);
    createModuleContainer('domainsModule', domainsModule);
  
    // **************************
    // Bandwidth by Protocol Module
    // **************************
    const protocolsModule = {
      chartInstance: null,
      groupConfig: {
        groupBy: ['protocol'],
        aggregates: {
          connections: 'sum',
          incomingMB: 'sum',
          outgoingMB: 'sum',
          totalMB: 'sum'
        }
      },
      
      processData: function(data) {
        if (!data || !data.rawData || !data.rawDataColIndex) return [];
        
        const colIdx = data.rawDataColIndex;
        const processedData = data.rawData.map(row => ({
          protocol: row[colIdx.protocol] || 'unknown',
          connections: row[colIdx.connections] || 1,
          incomingMB: (row[colIdx.rxBytes] || 0) / (1024 * 1024),
          outgoingMB: (row[colIdx.txBytes] || 0) / (1024 * 1024),
          totalMB: ((row[colIdx.rxBytes] || 0) + (row[colIdx.txBytes] || 0)) / (1024 * 1024)
        }));
        
        return groupData(processedData, this.groupConfig.groupBy, this.groupConfig.aggregates)
          .sort((a, b) => b.totalMB - a.totalMB);
      },
      
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
                label: 'Outgoing Bandwidth',
                backgroundColor: 'rgba(255, 159, 64, 0.6)',
                data: [],
                barPercentage: 1,
                categoryPercentage: 0.5
              },
              {
                label: 'Incoming Bandwidth',
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                data: [],
                barPercentage: 1,
                categoryPercentage: 0.5
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { 
                stacked: false
              },
              y: {
                stacked: false,
                type: 'logarithmic',
                title: {
                  display: true,
                  text: 'Bandwidth (MB)'
                }
              }
            },
            plugins: {
              title: {
                display: true,
                text: 'Top 10 Protocols by Bandwidth'
              }
            }
          }
        });
      },
      
      onDataUpdate: function(data) {
        this.processedData = this.processData(data);
        const chartData = this.processedData.slice(0, 10) // Only top 10 for chart
        
        this.chartInstance.data.labels = chartData.map(p => p.protocol);
        
        // Update outgoing bandwidth
        this.chartInstance.data.datasets[0].data = chartData.map(p => p.outgoingMB);
        
        // Update incoming bandwidth
        this.chartInstance.data.datasets[1].data = chartData.map(p => p.incomingMB);
        
        this.chartInstance.update();
      },

      generateTable: function(table, data) {
        const processedData = this.processedData; // Use all data for table
        
        const columns = [
          { field: 'protocol', label: 'Protocol' },
          { field: 'connections', label: 'Connections' },
          { field: 'incomingMB', label: 'Incoming (MB)', format: formatDigits },
          { field: 'outgoingMB', label: 'Outgoing (MB)', format: formatDigits },
          { field: 'totalMB', label: 'Total (MB)', format: formatDigits }
        ];
        
        const enhancedTable = createEnhancedTable(processedData, columns);
        table.appendChild(enhancedTable);
      }
    };
    DataManager.registerModule(protocolsModule, ['rawData', 'rawDataColIndex']);
    createModuleContainer('protocolsModule', protocolsModule);
  
    // **************************
    // Connections by Protocol Module
    // **************************
    const protocolsConnectionsModule = {
      chartInstance: null,
      groupConfig: {
        groupBy: ['protocol'],
        aggregates: {
          connections: 'sum',
          incomingMB: 'sum',
          outgoingMB: 'sum',
          totalMB: 'sum'
        }
      },
      
      processData: function(data) {
        if (!data || !data.rawData || !data.rawDataColIndex) return [];
        
        const colIdx = data.rawDataColIndex;
        const processedData = data.rawData.map(row => ({
          protocol: row[colIdx.protocol] || 'unknown',
          connections: row[colIdx.connections] || 1,
          incomingMB: (row[colIdx.rxBytes] || 0) / (1024 * 1024),
          outgoingMB: (row[colIdx.txBytes] || 0) / (1024 * 1024),
          totalMB: ((row[colIdx.rxBytes] || 0) + (row[colIdx.txBytes] || 0)) / (1024 * 1024)
        }));
        
        return groupData(processedData, this.groupConfig.groupBy, this.groupConfig.aggregates)
          .sort((a, b) => b.connections - a.connections);
      },
      
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
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                data: [],
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { 
                stacked: false
              },
              y: {
                stacked: false,
                type: 'logarithmic',
                title: {
                  display: true,
                  text: 'Connections'
                }
              }
            },
            plugins: {
              title: {
                display: true,
                text: 'Top 10 Protocols by Connections'
              }
            }
          }
        });
      },
      
      onDataUpdate: function(data) {
        this.processedData = this.processData(data);
        const chartData = this.processedData.slice(0, 10) // Only top 10 for chart
        
        this.chartInstance.data.labels = chartData.map(p => p.protocol);
        
        this.chartInstance.data.datasets[0].data = chartData.map(p => p.connections);
        
        this.chartInstance.update();
      },

      generateTable: function(table, data) {
        const processedData = this.processedData; // Use all data for table
        
        const columns = [
          { field: 'protocol', label: 'Protocol' },
          { field: 'connections', label: 'Connections' },
          { field: 'incomingMB', label: 'Incoming (MB)', format: formatDigits },
          { field: 'outgoingMB', label: 'Outgoing (MB)', format: formatDigits },
          { field: 'totalMB', label: 'Total (MB)', format: formatDigits }
        ];
        
        const enhancedTable = createEnhancedTable(processedData, columns);
        table.appendChild(enhancedTable);
      }
    };
    DataManager.registerModule(protocolsConnectionsModule, ['rawData', 'rawDataColIndex']);
    createModuleContainer('protocolsConnectionsModule', protocolsConnectionsModule);
    
    // **************************
    // ASN Top Talkers Module
    // **************************
    const asnModule = {
      chartInstance: null,
      groupConfig: {
        groupBy: ['asn'],
        aggregates: {
          traffic: 'sum'
        }
      },
      
      processData: function(data) {
        if (!data || !data.rawData || !data.rawDataColIndex) return [];
        
        const colIdx = data.rawDataColIndex;
        const processedData = data.rawData.map(row => ({
          asn: row[colIdx.asn] || 'unknown',
          traffic: ((row[colIdx.rxBytes] || 0) + (row[colIdx.txBytes] || 0)) / (1024 * 1024)
        }));
        
        return groupData(processedData, this.groupConfig.groupBy, this.groupConfig.aggregates)
          .sort((a, b) => b.traffic - a.traffic);
      },
      
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
        this.processedData = this.processData(data);
        const chartData = this.processedData.slice(0, 10) // Only top 10 for chart
        
        this.chartInstance.data.labels = chartData.map(d => d.asn);
        this.chartInstance.data.datasets[0].data = chartData.map(d => d.traffic);
        this.chartInstance.update();
      },

      generateTable: function(table, data) {
        const processedData = this.processedData; // Use all data for table
        
        const columns = [
          { field: 'asn', label: 'ASN' },
          { field: 'traffic', label: 'Traffic (MB)' }
        ];
        
        const enhancedTable = createEnhancedTable(processedData, columns);
        table.appendChild(enhancedTable);
      }
    };
    DataManager.registerModule(asnModule, ['rawData', 'rawDataColIndex']);
    createModuleContainer('asnModule', asnModule);
  
    // **************************
    // Top Destination Ports Module
    // **************************
    const portsModule = {
      chartInstance: null,
      groupConfig: {
        groupBy: ['port'],
        aggregates: {
          connections: 'sum'
        }
      },
      
      processData: function(data) {
        if (!data || !data.rawData || !data.rawDataColIndex) return [];
        
        const colIdx = data.rawDataColIndex;
        const processedData = data.rawData.map(row => ({
          port: row[colIdx.port] || 'unknown',
          connections: row[colIdx.connections] || 1
        }));
        
        return groupData(processedData, this.groupConfig.groupBy, this.groupConfig.aggregates)
          .sort((a, b) => b.connections - a.connections);
      },
      
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
        this.processedData = this.processData(data);
        const chartData = this.processedData.slice(0, 10) // Only top 10 for chart
        
        this.chartInstance.data.labels = chartData.map(p => p.port);
        this.chartInstance.data.datasets[0].data = chartData.map(p => p.connections);
        this.chartInstance.update();
      },

      generateTable: function(table, data) {
        const processedData = this.processedData; // Use all data for table
        
        const columns = [
          { field: 'port', label: 'Port' },
          { field: 'connections', label: 'Connections' }
        ];
        
        const enhancedTable = createEnhancedTable(processedData, columns);
        table.appendChild(enhancedTable);
      }
    };
    DataManager.registerModule(portsModule, ['rawData', 'rawDataColIndex']);
    createModuleContainer('portsModule', portsModule);
  
    // **************************
    // Connection Durations Distribution Module
    // **************************
    const durationsModule = {
      chartInstance: null,
      groupConfig: {
        groupBy: ['durationBucket'],
        aggregates: {
          connections: 'sum'
        }
      },
      
      processData: function(data) {
        if (!data || !data.rawData || !data.rawDataColIndex) return [];
        
        const colIdx = data.rawDataColIndex;
        const processedData = data.rawData.map(row => {
          duration = parseFloat(row[colIdx.duration]) || 1;
          duration /= row[colIdx.connections] || 1;

          let bucket;
          if (duration < 1000) bucket = '<1s';
          else if (duration < 5000) bucket = '1-5s';
          else if (duration < 30000) bucket = '5-30s';
          else if (duration < 60000) bucket = '30-60s';
          else if (duration < 300000) bucket = '60-300s';
          else bucket = '>300s';
          return { durationBucket: bucket, connections: row[colIdx.connections] };
        });
        
        const grouped = groupData(processedData, this.groupConfig.groupBy, this.groupConfig.aggregates);
        
        // Ensure all buckets exist with at least 0 connections
        const buckets = ['<1s', '1-5s', '5-30s', '30-60s', '60-300s', '>300s'];
        return buckets.map(bucket => {
          const found = grouped.find(g => g.durationBucket === bucket);
          return found || { durationBucket: bucket, connections: 0 };
        });
      },
      
      render: function(canvas) {
        if (this.chartInstance) {
          this.chartInstance.destroy();
        }

        const context = canvas.getContext('2d');
        this.chartInstance = new Chart(context, {
          type: 'bar',
          data: {
            labels: ['<1s', '1-5s', '5-30s', '30-60s', '60-300s', '>300s'],
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
              y: { beginAtZero: true }
            }
          }
        });
      },
      
      onDataUpdate: function(data) {
        this.processedData = this.processData(data);
        this.chartInstance.data.datasets[0].data = this.processedData.map(d => d.connections);
        this.chartInstance.update();
      },

      generateTable: function(table, data) {
        const processedData = this.processedData;
        
        const columns = [
          { field: 'durationBucket', label: 'Duration' },
          { field: 'connections', label: 'Connections' }
        ];
        
        const enhancedTable = createEnhancedTable(processedData, columns);
        table.appendChild(enhancedTable);
      }
    };
    DataManager.registerModule(durationsModule, ['rawData', 'rawDataColIndex']);
    createModuleContainer('durationsModule', durationsModule);
    
     // **************************
    // Top Clients by Bandwidth Module
    // **************************
    const topClientsByBandwidthModule = {
      chartInstance: null,
      groupConfig: {
        groupBy: ['client_name'],
        aggregates: {
          bytes_in: 'sum',
          bytes_out: 'sum',
          bandwidth: 'sum'
        }
      },

      processData(data) {
        if (!data || !data.rawData || !data.rawDataColIndex) return [];
        
        const colIdx = data.rawDataColIndex;
        const processedData = data.rawData.map(row => ({
          client_name: row[colIdx.clientName] || '',
          bytes_in: row[colIdx.rxBytes] || 0,
          bytes_out: row[colIdx.txBytes] || 0,
          bandwidth: (row[colIdx.rxBytes] || 0) + (row[colIdx.txBytes] || 0)
        }));
        
        return groupData(processedData, this.groupConfig.groupBy, this.groupConfig.aggregates)
          .sort((a, b) => (b.bytes_in + b.bytes_out) - (a.bytes_in + a.bytes_out));
      },

      render(canvas) {
        if (this.chartInstance) {
          this.chartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        
        this.chartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: [],
            datasets: [
              {
                label: 'Incoming',
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                data: []
              },
              {
                label: 'Outgoing',
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                data: []
              }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Top Clients by Bandwidth (MB)'
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const value = context.raw;
                    return `${context.dataset.label}: ${value.toFixed(2)} MB`;
                  }
                }
              }
            },
            scales: {
              x: {
                stacked: true,
                ticks: {
                  callback: function(value) {
                    return `${value.toFixed(2)} MB`;
                  }
                }
              },
              y: {
                stacked: true
              }
            }
          }
        });
      },

      onDataUpdate(data) {
        this.processedData = this.processData(data);
        
        if (this.chartInstance) {
          // Only show top 10 in chart
          const chartData = this.processedData.slice(0, 10);
          this.chartInstance.data.labels = chartData.map(item => item.client_name);
          // Convert bytes to MB (1 MB = 1024 * 1024 bytes)
          this.chartInstance.data.datasets[0].data = chartData.map(item => item.bytes_in / (1024 * 1024));
          this.chartInstance.data.datasets[1].data = chartData.map(item => item.bytes_out / (1024 * 1024));
          this.chartInstance.update();
        }
      },

      generateTable(table, data) {
        const processedData = this.processedData;
        
        const formatBytes = bytes => (bytes / (1024 * 1024)).toFixed(2);

        const columns = [
          { field: 'client_name', label: 'Client' },
          { field: 'bytes_in', label: 'Incoming (MB)', format: formatBytes},
          { field: 'bytes_out', label: 'Outgoing (MB)', format: formatBytes},
          { field: 'bandwidth', label: 'Total (MB)', format: formatBytes }
        ];
        
        const enhancedTable = createEnhancedTable(processedData, columns);
        table.appendChild(enhancedTable);
      }
    };
    DataManager.registerModule(topClientsByBandwidthModule, ['rawData', 'rawDataColIndex']);
    createModuleContainer('topClientsModule', topClientsByBandwidthModule);

    // **************************
    // Function to process network data
    // **************************
    function processNetworkData(rawData) {
      const processedData = {
        rawData: [],
        rawDataColIndex: {},
      };

      // Create index map for columns
      const colIndex = {};
      rawData.columns.forEach((col, index) => colIndex[col] = index);

      // Process each row
      rawData.data.forEach(row => {
        // Get all available data fields
        const family = parseInt(row[colIndex.family]) || 0;
        const proto = row[colIndex.proto] || '';
        const mac = row[colIndex.mac] || '';
        const ip = row[colIndex.ip] || '';  
        const client_name = row[colIndex.client_name] || ip;
        const port = parseInt(row[colIndex.port]) || 0;
        const protocol = row[colIndex.protocol] || '';
        const direction = row[colIndex.direction] || '';
        const asn = row[colIndex.asn] || '';
        const country = (row[colIndex.country] || '').split(' ')[0];
        const lonlat = row[colIndex.lonlat] || [0, 0];
        const conns = parseInt(row[colIndex.conns]) || 0;
        const rx_bytes = parseInt(row[colIndex.rx_bytes]) || 0;
        const rx_pkts = parseInt(row[colIndex.rx_pkts]) || 0;
        const tx_bytes = parseInt(row[colIndex.tx_bytes]) || 0;
        const tx_pkts = parseInt(row[colIndex.tx_pkts]) || 0;
        const duration = parseInt(row[colIndex.duration]) || 0;
        const topl_domain = row[colIndex.topl_domain] || '';
        const hosts = row[colIndex.hosts] || [];
        const last_ext_addr = row[colIndex.last_ext_addr] || '';

        // Check if it's a router connection (MAC is all 00's or IP is 0.0.0.0)
        const isRouterConnection = (mac && mac.split(':').every(part => part === '00')) && ip === '0.0.0.0';
        
        // Filter based on current connection mode
        let includeConnection = false;
        if (currentConnectionMode === 'clients') {
          includeConnection = !isRouterConnection;
        } else if (currentConnectionMode === 'router') {
          includeConnection = isRouterConnection;
        } else { // 'all' mode
          includeConnection = true;
        }
        
        if (includeConnection) {
          // Push to processedData.rawData an entry with all the available data fields
          processedData.rawData.push([
            family,
            proto,
            mac,
            ip,
            client_name,
            port,
            protocol,
            direction,
            asn,
            country,
            lonlat,
            conns,
            rx_bytes,
            rx_pkts,
            tx_bytes,
            tx_pkts,
            duration,
            topl_domain,
            hosts,
            last_ext_addr
          ]);
        }
      });

      // Store raw data column index mapping to processedData.rawData array indices
      processedData.rawDataColIndex = {
        family: 0,
        proto: 1,
        mac: 2,
        ip: 3,
        clientName: 4,
        port: 5,
        protocol: 6,
        direction: 7,
        asn: 8,
        country: 9,
        lonlat: 10,
        connections: 11,
        rxBytes: 12,
        rxPackets: 13,
        txBytes: 14,
        txPackets: 15,
        duration: 16,
        domain: 17,
        hosts: 18,
        lastExtAddr: 19
      };

      window.rawData = processedData.rawData;
      window.rawDataColIndex = processedData.rawDataColIndex;
      // Update all modules with the raw data
      DataManager.updateData(processedData);
    }

    // Replace simulation with actual data fetching
    function fetchAndUpdateData() {
      fetch('/cgi-bin/luci/admin/network_monitoring/data')
        .then(response => response.json())
        .then(rawData => {
          const processedData = processNetworkData(rawData);
          if (processedData) {
            DataManager.updateData(processedData);
          }
        })
        .catch(error => console.error('Error fetching network data:', error));
    }

    // Initial fetch
    fetchAndUpdateData();
  });
