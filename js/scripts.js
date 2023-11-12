const fs = require('fs');
const path = require('path');

const dataFolderPath = '../data';

let data = {};

try{
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
                name : workflowName,
                modules : modules
            };
        });
        //console.log('Data : ', data);
        //console.log('Data from file ${file} : ', jsonData);
    });

}catch(err){
    console.error('Error resding folder : ', err);
}

console.log('Data : ', data);

// List of all possible statuses for data items
const moduleStatus = ["INIT", "IDLE", "BUSY", "ERROR", "UNKNOWN"];
const workflowStatus = ["new", "queued", "running", "completed", "failed", "unknown"];
const stepStatus = ["idle", "running", "succeeded", "failed"]

const allStatus = ["INIT", "new",             // New Item  => Show Gray on Modules
                   "IDLE", "queued", "idle",  // Empty     => White
                   "BUSY", "running",         // Running   => Gray 
                   "completed", "succeeded",  // Done      => Light Gray 
                   "ERROR", "failed",         // Error     => Red
                   "UNKNOWN", "unknown"];     // Unknown   => Blue

document.addEventListener("DOMContentLoaded", function () {
    // Get a reference to the workflow list container
    const workflowList = document.getElementById("workflow-list");

    // Load workcell state JSON from file

    // Simulate loading workflows from a JSON file (replace with actual data loading)
    const workflowsData = [
        { name: "Workflow 1", protocols: ["Protocol 1", "Protocol 2", "Protocol 3"], size: 10, status: "failed" },
        { name: "Workflow 2", protocols: ["Protocol A", "Protocol B"], size: 5, status: "running" },
        { name: "Workflow 3", protocols: ["Protocol X", "Protocol Y", "Protocol Z"], size: 15, status: "queued" },
        // Add more workflow data as needed
    ];

    // Simulate loading modules from file
    const modulesData = [
        { name: "Module 1", status: "BUSY", workflowRunID: "Workflow 1" },
        { name: "Module 2", status: "ERROR", workflowRunID: "Workflow 2" }, 
        { name: "Module 3", status: "IDLE", workflowRunID: "Workflow 3" },
        { name: "Module 4", status: "UNKNOWN", workflowRunID: "Workflow 1" }
        // Add more module data as needed
    ];

    //Create color scale 
    const statusColor = d3.scaleOrdinal().domain(allStatus)
        .range(["gray", "gray", "white", "white", "white", "gray", "gray", "silver", "silver", "red", "red", "dodgerblue", "dodgerblue "])

    // Function to create a workflow item
    function createWorkflowItem(workflowData) {
        const workflowItem = document.createElement("div");
        workflowItem.className = "workflow";
        workflowItem.innerText = workflowData.name;

        const dropdown = document.createElement("div");
        dropdown.className = "workflow-dropdown";
        workflowData.protocols.forEach((protocol) => {
            const protocolItem = document.createElement("li");
            protocolItem.innerText = protocol;
            dropdown.appendChild(protocolItem);
        });

        workflowItem.appendChild(dropdown);

        workflowItem.addEventListener("click", function () {
            if (dropdown.style.display === "block") {
                dropdown.style.display = "none";
            } else {
                dropdown.style.display = "block";
            }
        });

        return workflowItem;
    }
    
    function enumerateItem(data)
    {
        return data.length;
    }

    // FUNCTIONS TO INITIALIZE PANELS
    function createModuleStatus(panelName) {

        // Get number of data items to draw
        itemNum = enumerateItem(modulesData); //using dummy data for testing

        //create SVG object
        var svg = d3.select(panelName).append("svg")
        
        //create sha[es based on item number
        for(let i = 0; i < itemNum; i++)
        {
            svg.append('rect')
                .attr('x', 10 + (50 * i))
                .attr('y', "30%")
                .attr('width', 50)
                .attr('height', 30)
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
        }   

        //join shapes to data 
        svg.selectAll('rect')
            .data(modulesData)
            .join("rect")
            .attr("fill", function(d) {return statusColor(d.status)}) 
            .on('mouseover',function(d){
                d3.select(this).transition()
                    .duration('50')
                    .attr("stroke-width", 2.5);})
            .on('mouseout',function(d){
                d3.select(this).transition()
                    .duration('50')
                    .attr("stroke-width", 1);
            });

    }

    
    function createWorkflowQueue(panelName) {
        
        // Get number of data items to draw
        itemNum = enumerateItem(workflowsData); //using dummy data for testing

        //create SVG object
        var svg = d3.select(panelName).append("svg")
        
        //create shapes based on item number
        for(let i = 0; i < itemNum; i++)
        {
            svg.append('rect')
                .attr('x', 10)
                .attr('y', 10 + (50 * i))
                .attr('width', 60)
                .attr('height', 40)
                .attr('stroke', 'black')
                
        }   

        //join shapes to data 
        svg.selectAll('rect')
            .data(workflowsData)
            .join("rect")
            .style('fill', function(d) {return statusColor(d.status)})
            .on('mouseover',function(d){
                d3.select(this).transition()
                    .duration('50')
                    .attr("stroke-width", 2.5);})
            .on('mouseout',function(d){
                d3.select(this).transition()
                    .duration('50')
                    .attr("stroke-width", 1);
            });

    }

    function createFutureState(panelName) {

        // Get number of data items to draw
        itemNum = enumerateItem(modulesData); //using dummy data for testing

        //create SVG object
        var svg = d3.select(panelName).append("svg")
        
        //create shapes based on item number
        for(let i = 0; i < itemNum; i++)
        {
            svg.append('rect')
                .attr('x', 10 + (50 * i))
                .attr('y', "20%")
                .attr('width', 60)
                .attr('height', 40)
                .attr('stroke', 'black')
        }   

        //join shapes to data 
        svg.selectAll('rect')
            .data(modulesData)
            .join("rect")
            .attr("fill", function(d) {return statusColor(d.status)}) 
            .on('mouseover',function(d){
                d3.select(this).transition()
                    .duration('50')
                    .attr("stroke-width", 2.5);})
            .on('mouseout',function(d){
                d3.select(this).transition()
                    .duration('50')
                    .attr("stroke-width", 1);
            });

    }

    function createAmbitious(panelName) {
        // Get number of data items to draw
        itemNum = enumerateItem(workflowsData); //using dummy data for testing

        //create SVG object
        var svg = d3.select(panelName).append("svg")
        
        //create circles based on item number
        for(let i = 0; i < itemNum; i++)
        {
            svg.append('circle')
                .attr('cx', 50 + (50 * i))
                .attr('cy', '50')
                .attr('stroke', 'black')
                .attr('r', 20)
        }   

        //join circles to data 
        svg.selectAll('circle')
            .data(workflowsData)
            .join("circle")
            .attr("r", function(d) {return d.size}) 
            .style('fill', function(d) {return statusColor(d.status)})
            .on('mouseover',function(d){
                d3.select(this).transition()
                    .duration('50')
                    .attr("stroke-width", 2.5);})
            .on('mouseout',function(d){
                d3.select(this).transition()
                    .duration('50')
                    .attr("stroke-width", 1);
            });

    }

    // Generate and append workflow items to the workflow list container
    workflowsData.forEach((workflowData) => {
        const workflowItem = createWorkflowItem(workflowData);
        workflowList.appendChild(workflowItem);
    });

    //Create plots
    createModuleStatus("#module-status");
    createWorkflowQueue("#workflow-queue");
    createFutureState("#future-state");
    createAmbitious("#ambitious");
});