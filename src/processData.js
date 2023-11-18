const { Console } = require('console');
const fs = require('fs');
const path = require('path');

// Function to read JSON files from a folder
function readJsonFilesFromFolder(folderPath) {
  console.log('Data Folder path : ', folderPath);
  const jsonFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.json'));
  const jsonData = {};
  console.log('JSON files : ', jsonFiles);
  for (const file of jsonFiles) {
    const filePath = path.join(folderPath, file);
    const fileName = path.parse(file).name;

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      jsonData[fileName] = JSON.parse(fileContent);
    } catch (error) {
      console.error(`Error reading JSON file ${filePath}: ${error.message}`);
    }
  }
  console.log('JSON Data : ', jsonData);
  return jsonData;
}

// Transformation functions
function extractWorkflows(jsonFilesData) {
  const workflows = [];

  for (const workflowId in jsonFilesData.workflows) {
    console.log('Processing workflow:', workflowId);
    
    const workflow = jsonFilesData.workflows[workflowId];

    const workflowObj = {
      name: workflow.name,
      workflowRunID: workflow.run_id,
      status: workflow.status,
      step_index: workflow.step_index,
      steps: [],
    };

    for (const step of workflow.steps) {
      console.log('Processing step:', step.id);
      
      const module = json.modules[step.module];
      const locations = module.workcell_coordinates.map((coord, index) => ({
        name: `${module.name}.loc${index + 1}`,
        parent_module: module.name,
        queue: [],
        workflowRunID: module.id,
      }));

      const stepObj = {
        action: step.action,
        comment: step.comment,
        workflowRunID: workflow.run_id,
        locations: locations.map(location => location.name),
        module_name: module.name,
        step_name: step.name,
      };

      workflowObj.steps.push(stepObj);

      // Add locations to the global locations array
      locations.forEach(location => jsonFilesData.locations.workcell[location.name] = location);
    }

    workflows.push(workflowObj);
  }

  return workflows;
}

function extractModules(jsonFilesData) {
  const modules = [];

  for (const moduleId in jsonFilesData.modules) {
    console.log('Processing module:', moduleId);
    
    const module = jsonFilesData.modules[moduleId];

    const moduleObj = {
      locations: module.workcell_coordinates.map((coord, index) => `${module.name}.loc${index + 1}`),
      name: module.name,
      queue: module.queue,
      status: module.state,
      workflowRunID: module.id,
    };

    modules.push(moduleObj);
  }

  return modules;
}

function extractLocations(jsonFilesData) {
  const locations = [];

  if (jsonFilesData.locations && jsonFilesData.locations.workcell) {
    for (const locationId in jsonFilesData.locations.workcell) {
      console.log('Processing location:', locationId);
      
      const location = jsonFilesData.locations.workcell[locationId];

      const locationObj = {
        name: location.name,
        parent_module: location.parent_module,
        queue: location.queue,
        workflowRunID: location.workflowRunID,
      };

      locations.push(locationObj);
    }
  }

  return locations;
}

// Specify your folder path here
const dataFolder = 'data';
const jsonFilesData = readJsonFilesFromFolder(dataFolder);
console.log('Json files data before console : ', jsonFilesData);

// Example usage
// Add these lines at the beginning of your script, before calling the extraction functions
console.log('Keys in json.workflows:', Object.keys(jsonFilesData.workflows));
console.log('Keys in json.modules:', Object.keys(jsonFilesData.modules));
console.log('Keys in json.locations.workcell:', jsonFilesData.locations ? Object.keys(jsonFilesData.locations.workcell) : 'N/A');

// Rest of your code...


const transformedData = {
  workflows: extractWorkflows(jsonFilesData),
  modules: extractModules(jsonFilesData),
  locations: extractLocations(jsonFilesData),
};

console.log(JSON.stringify(transformedData, null, 2));