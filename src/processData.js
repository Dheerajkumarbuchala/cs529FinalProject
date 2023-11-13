const fs = require('fs');
const path = require('path');

const processData = () => {
    console.log('Runiing')
    const dataFolderPath = 'data';
    let data = {};

    try {
        const files = fs.readdirSync(dataFolderPath)
        files.forEach((file) => {
            const filePath = path.join(dataFolderPath, file);
            const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            //console.log('WorkFlow : ', jsonData.workflows);
            const keys = Object.keys(jsonData.workflows)
            console.log('Keys : ', keys);
            keys.forEach((key) => {
                console.log('Key : ', key);
                var workflow = jsonData.workflows[key];
                //console.log('WorkFlow : ', workflow);
                var workflowName = workflow.name;
                console.log('WorkFlow Name : ', workflowName);
                var modules = workflow.modules;
                console.log('Modules : ', modules);
                data[key] = {
                    name: workflowName,
                    modules: modules
                };
            });
            //console.log('Data : ', data);
            //console.log('Data from file ${file} : ', jsonData);
        });

    } catch (err) {
        console.error('Error resding folder : ', err);
    }

    fs.writeFileSync("../public/data/data.json", JSON.stringify(data,null,2), 'utf8')
}


module.exports = processData