const fs = require('fs');
const path = require('path');

const processDataV2 = () => {
  // Function to read JSON files from a folder
  function readJsonFiles(folderPath) {
    const files = fs.readdirSync(folderPath);
    const jsonData = [];

    files.forEach(file => {
      const filePath = path.join(folderPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(fileContent);
      jsonData.push(json);
    });

    return jsonData;
  }

  // Specify the path to your data folder
  const dataFolderPath = 'data'; // Replace with the actual path

  // Read all JSON files from the data folder
  const allJsonData = readJsonFiles(dataFolderPath);

  // Extract workflows, modules, and locations from all JSON files
  const extractedData = allJsonData.reduce((result, originalData) => {
    // Extract workflows
    const workflows = Object.entries(originalData.workflows).reduce((workflowResult, [workflowId, workflow]) => {
      const steps = workflow.steps.map((step, stepIndex) => {
        const moduleId = step.module;
        const module = originalData.modules[moduleId];

        return {
          action: step.action,
          comment: step.comment,
          id: 'wf_' + workflowId,
          locations: {},
          module_name: module.name,
          step_name: step.name,
        };
      });

      workflowResult[workflowId] = {
        wf_name: workflow.name,
        id: 'wf_' + workflowId,
        status: workflow.status,
        step_index: workflow.step_index,
        steps,
      };

      return workflowResult;
    }, {});

    // Extract modules
    const modules = Object.entries(originalData.modules).reduce((moduleResult, [moduleId, module]) => {
      moduleResult[module.name] = {
        locations: module.workcell_coordinates,
        name: module.name,
        queue: module.queue,
        status: module.state,
        id: 'wf_' + module.id,
      };
      return moduleResult;
    }, {});

    // Extract locations
    const locations = Object.entries(originalData.locations).reduce((locationResult, [locationId, location]) => {
      locationResult[location.name] = {
        name: location.name,
        parent_module: locationId,
        queue: location.queue,
        status: location.state,
      };
      return locationResult;
    }, {});

    return {
      workflows: Object.assign(result.workflows || {}, workflows),
      modules: Object.assign(result.modules || {}, modules),
      locations: Object.assign(result.locations || {}, locations),
    };
  }, {});

  //console.log(extractedData);

  fs.writeFileSync("../public/data/data.json", JSON.stringify(extractedData,null,2), 'utf8')
}
module.exports = processDataV2