const jsonData = require('./wei.json');

const workflows = jsonData.workflows;
console.log("Workflows : ", workflows);

const modules = jsonData.workcell.modules;

const modules_data = []

for(var module in modules){
    var mod = modules[module]
    var dict = {}
    dict['id'] = mod.id
    dict['name'] = mod.name
    dict['status'] = mod.active
    dict['rest_node_address'] = mod.config.rest_node_address
    dict['interface'] = mod.interface
    dict['model'] = mod.model
    dict['workcell_coordinates'] = mod.workcell_coordinates
    dict['queue'] = mod.queue
    modules_data.push(dict)
}

console.log("Modules Data : ", modules_data);