module("luci.controller.network_monitoring", package.seeall)

function index()
    -- This creates a new entry under the "Status" menu (adjust as needed)
    entry({"admin", "status", "network_monitoring"}, template("network_monitoring/snapshot_index"), _("Network Monitoring"), 60)
    entry({"admin", "network_monitoring", "data"}, call("action_data"), nil).dependent = false
end

function action_data()
    local http = require "luci.http"
    local nixio = require "nixio"
    
    -- Connect to the local service using nixio
    local host = "127.0.0.1"
    local port = 1998
    
    -- Create socket
    local sock, err = nixio.connect(host, port)
    if not sock then
        http.status(500, "Internal Server Error")
        http.prepare_content("application/json")
        http.write_json({
            error = "Unable to connect to the service: " .. tostring(err)
        })
        return
    end
    
    -- Set receive timeout to 2 seconds
    sock:setopt("socket", "rcvtimeo", 2)
    sock:write("json\n")
    
    -- Read data from the service
    local data = ""
    while true do
        local fragment, recv_err = sock:recv(4096)
        if fragment and #fragment > 0 then
            data = data .. fragment
        elseif recv_err == "timeout" then
            sock:close()
            http.status(408, "Request Timeout")
            http.prepare_content("application/json")
            http.write_json({
                error = "Timeout while reading from service"
            })
            return
        else
            -- Either we got nil data with no error (clean close)
            -- or we got an empty string (also indicates close)
            break
        end
    end
    
    sock:close()
    
    -- Process the received data
    if #data > 0 then
        http.prepare_content("application/json")
        http.write(data)
    else
        http.status(500, "Internal Server Error")
        http.prepare_content("application/json")
        http.write_json({
            error = "No data received from service"
        })
    end
end
