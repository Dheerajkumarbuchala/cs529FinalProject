const jsonData = require('./wei.json');

const workflows = jsonData.workflows;
//console.log("Workflows : ", workflows);

// const workflowModules = jsonData.workflows.modules;
// console.log(workflowModules);

const modules = jsonData.workcell.modules;

//console.log(jsonData.workflows.experiment_id)

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

//console.log("Modules Data : ", modules_data);

const fs = require('fs');
const path = require('path');

const dataFolderPath = '../data';

fs.readdir(dataFolderPath, (err, files) =>{
    if(err){
        console.error('Error resding folder : ', err);
        return;
    }

    files.forEach((file) => {
        const filePath = path.join(dataFolderPath, file);
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log('Data from file ${file} : ', jsonData);
    });
});