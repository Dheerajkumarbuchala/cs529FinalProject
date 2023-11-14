const res = null;

// Loading data
fetch("/public/data/data.json").then((response) => {
    response.json().then((data) => {
        //console.log(data);
        fetchingData(data);
    })
})

function fetchingData(data){
    console.log(data);
}

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

const padding = 10;

document.addEventListener("DOMContentLoaded", function () {
    // Get a reference to the workflow list container
    const workflowList = document.getElementById("workflow-list");

    // Load workcell state JSON from file

    // Simulate loading workflows from a JSON file (replace with actual data loading)
    const workflowsData = [
        { name: "Workflow-1", protocols: ["Protocol 1", "Protocol 2", "Protocol 3"], size: 10, status: "failed" },
        { name: "Workflow-2", protocols: ["Protocol A", "Protocol B"], size: 5, status: "running" },
        { name: "Workflow-3", protocols: ["Protocol X", "Protocol Y", "Protocol Z"], size: 15, status: "queued" },
        { name: "Workflow-4", protocols: ["Protocol X", "Protocol Y", "Protocol Z"], size: 15, status: "unknown" },
        // Add more workflow data as needed
    ];

    // Simulate loading modules from file
    const modulesData = [
        { name: "Module 1", status: "ERROR", workflowRunID: "Workflow-1" },
        { name: "Module 2", status: "BUSY", workflowRunID: "Workflow-2" }, 
        { name: "Module 3", status: "IDLE", workflowRunID: "None" },
        { name: "Module 4", status: "INIT", workflowRunID: "Workflow-3" },
        // Add more module data as needed
    ];

    //Create color scale 
    const statusColor = d3.scaleOrdinal().domain(allStatus)
        .range(["gray", "gray", "white", "white", "white", "gray", "gray", "silver", "silver", "red", "red", "dodgerblue", "dodgerblue"])

    /*
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
    }*/
    
    //** Panel Plots helper functions **//
    function enumerateItem(data)
    {
        return data.length;
    }

    function getParentBounds(panelName)
    {
        var width = d3.select("#" + panelName).node().getBoundingClientRect().width;
        var height = d3.select("#" + panelName).node().getBoundingClientRect().height; 

        //console.log("From getParentBounds(" + panelName + "): " + width + " " + height);

        return [width, height];
    }

    function initSVG(panelName)
    {
        var [width, height] = getParentBounds(panelName);

        //console.log("from initSVG(" + panelName + "): " + width + " " + height);

        //create SVG object
        var svg = d3.select("#" + panelName).append("svg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("width", width)
            .attr("height", height);

        return svg;
    }

    //** Functions to initialize panels **//
    function createModuleStatus(panelName) {
        // Get number of data items to draw
        itemNum = enumerateItem(modulesData); //using dummy data for testing

        // Create SVG size of parent div
        var svg = initSVG(panelName);
    
        // Get bounds for SVG canvas and data item elements
        var width = svg.style("width").replace("px", "");
        var height = svg.style("height").replace("px", "");

        var boxWidth = width/itemNum - (padding/2);
        var boxHeight = height - (padding/2);

        var [moduleWidth, moduleHeight] = [(boxWidth - (padding * 3)), (boxHeight) - padding];


        // Create module block for each module
        svg.selectAll("g")
            .data(modulesData)
            .enter().append("g")
            .attr("transform", function(d, i) { 
                    return "translate(" + (boxWidth * i) + "," + padding + ")"});

        // Add rectangles colored by status
        svg.selectAll("g")
            .append("rect")
            .attr('width', moduleWidth)
            .attr('height', moduleHeight)
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr("fill", function(d) {return statusColor(d.status)})  
            .attr('class', function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
            .on('mouseover', function(e, d){
                d3.selectAll("." + d.workflowRunID).transition()
                    .duration('50')
                    .attr("stroke-width", 2.5);}) //highlight with stroke on hover
            .on('mouseout',function(e, d){
                d3.selectAll("." + d.workflowRunID).transition()
                    .duration('50')
                    .attr("stroke-width", 1);
            });

        
        // Add text - Module Name
        svg.selectAll("g")
            .append("text")
            .attr("x", moduleWidth/2)
            .attr("y", moduleHeight/2)
            .attr("text-anchor", "middle")
            .attr("dy", "0em")
            .text(function(d) { return d.name; })
            .attr('class',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
            .on('mouseover', function(e, d){
                d3.selectAll("." + d.workflowRunID).transition()
                    .duration('50');})
            .on('mouseout', function(e, d){
                d3.selectAll("." + d.workflowRunID).transition()
                    .duration('50'); });

        // Add text - WorkflowRunID
        svg.selectAll("g")
            .append("text")
            .attr("x", moduleWidth/2)
            .attr("y", moduleHeight/2)
            .attr("text-anchor", "middle")
            .attr("dy", "1em")
            .text(function(d) { return d.workflowRunID; })
            .attr('class',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
            .on('mouseover', function(e, d){
                d3.selectAll("." + d.workflowRunID).transition()
                    .duration('50');})
            .on('mouseout', function(e, d){
                d3.selectAll("." + d.workflowRunID).transition()
                    .duration('50'); });

    }

    
    function createWorkflowQueue(panelName) {
        
        // Get number of data items to draw
        var itemNum = enumerateItem(workflowsData); //using dummy data for testing

        // Create SVG size of parent div
        var svg = initSVG(panelName);

        // Get bounds for SVG canvas and data item elements
        var width = svg.style("width").replace("px", "");
        var height = svg.style("height").replace("px", "");

        var boxHeight = 40;
        var boxWidth = width - padding;

        // Create status block for each workflowRunID
        svg.selectAll("g")
            .data(workflowsData)
            .enter().append("g")
            .attr("transform", function(d, i) { 
                    return "translate(" + padding + "," + ((boxHeight + (padding/2)) * i) + ")"});
        
        // Add rectangles colored by status
        svg.selectAll("g")
            .append("rect")
            .attr('width', width - (padding + 10))
            .attr('height', 40)
            .attr('stroke', 'black')
            .style('fill', function(d, i) {
                console.log("I am in append rect: " + d.name + " " + i);
                return statusColor(d.status)})
            .attr('class',function(d) {return d.name}) //assign a class name == workflowrunID
            .on('mouseover', function(e, d){
                d3.selectAll("." + d.name).transition()
                    .duration('50')
                    .attr("stroke-width", 2.5);})
            .on('mouseout', function(e, d){
                d3.selectAll("." + d.name).transition()
                    .duration('50')
                    .attr("stroke-width", 1);
            });

        // Add text - WorkflowRunID
        svg.selectAll("g")
            .append("text")
            .attr("x", boxWidth/2)
            .attr("y", boxHeight/2)
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .text(function(d) { return d.name; })
            .attr('class',function(d) {return d.name}) //assign a class name == workflowrunID
            .on('mouseover', function(e, d){
                d3.selectAll("." + d.name).transition()
                    .duration('50')
                    .attr("stroke-width", 2.5);})
            .on('mouseout', function(e, d){
                d3.selectAll("." + d.name).transition()
                    .duration('50')
                    .attr("stroke-width", 1);
            });
    }

    function createFutureState(panelName) {

       // Get number of data items to draw
       itemNum = enumerateItem(modulesData); //using dummy data for testing

       // Create SVG size of parent div
       var svg = initSVG(panelName);
   
       // Get bounds for SVG canvas and data item elements
       var width = svg.style("width").replace("px", "");
       var height = svg.style("height").replace("px", "");

       var boxWidth = width/itemNum - (padding/2);
       var boxHeight = height - (padding/2);

       var [moduleWidth, moduleHeight] = [(boxWidth - (padding * 3)), (boxHeight) - padding];


       // Create module block for each module
       svg.selectAll("g")
           .data(modulesData)
           .enter().append("g")
           .attr("transform", function(d, i) { 
                   return "translate(" + (boxWidth * i) + "," + padding + ")"});

       // Add rectangles colored by status
       svg.selectAll("g")
           .append("rect")
           .attr('width', moduleWidth)
           .attr('height', moduleHeight)
           .attr('stroke', 'black')
           .attr('stroke-width', 1)
           .attr("fill", function(d) {return statusColor(d.status)}) 
           .attr('class', function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
           .on('mouseover', function(e, d){
               d3.selectAll("." + d.workflowRunID).transition()
                   .duration('50')
                   .attr("stroke-width", 2.5);})
           .on('mouseout',function(e, d){
               d3.selectAll("." + d.workflowRunID).transition()
                   .duration('50')
                   .attr("stroke-width", 1);
           });

       
       // Add text - Module name
       svg.selectAll("g")
           .append("text")
           .attr("x", moduleWidth/2)
           .attr("y", moduleHeight/2)
           .attr("text-anchor", "middle")
           .attr("dy", "0em")
           .text(function(d) { return d.name; })
           .attr('class',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
           .on('mouseover', function(e, d){
               d3.selectAll("." + d.workflowRunID).transition()
                   .duration('50');})
           .on('mouseout', function(e, d){
               d3.selectAll("." + d.workflowRunID).transition()
                   .duration('50'); });

        // Add text - WorkflowRunID
       svg.selectAll("g")
           .append("text")
           .attr("x", moduleWidth/2)
           .attr("y", moduleHeight/2)
           .attr("text-anchor", "middle")
           .attr("dy", "1em")
           .text(function(d) { return d.workflowRunID; })
           .attr('class',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
           .on('mouseover', function(e, d){
               d3.selectAll("." + d.workflowRunID).transition()
                   .duration('50');})
           .on('mouseout', function(e, d){
               d3.selectAll("." + d.workflowRunID).transition()
                   .duration('50'); });

    }

    function createAmbitious(panelName) {
        // Get number of data items to draw
        itemNum = enumerateItem(modulesData); //using dummy data for testing

        // Create SVG size of parent div
        var svg = initSVG(panelName);
    
        // Get bounds for SVG elements and data item elements
        var width = svg.style("width").replace("px", "");
        var height = svg.style("height").replace("px", "");

        var boxWidth = width/itemNum - (padding/2);
        var boxHeight = height - (padding/2);

        var [blockWidth, blockHeight] = [(boxWidth - padding), (boxHeight) - padding];


        // Create module block for each module
        svg.selectAll("g")
            .data(workflowsData)
            .enter().append("g")
            .attr("transform", function(d, i) { 
                    return "translate(" + (padding + (boxWidth * i)) + "," + padding + ")"});

        // Add rectangles colored by status
        svg.selectAll("g")
            .append("rect")
            .attr('width', blockWidth)
            .attr('height', blockHeight)
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr("fill", function(d) {return statusColor(d.status)}) 
            .attr('class', function(d) {return d.name}) //assign a class name == workflowrunID
            .on('mouseover', function(e, d){
                d3.selectAll("." + d.name).transition()
                    .duration('50')
                    .attr("stroke-width", 2.5);})
            .on('mouseout',function(e, d){
                d3.selectAll("." + d.name).transition()
                    .duration('50')
                    .attr("stroke-width", 1);
            });

        
        // Add text - WorkflowRunID
        svg.selectAll("g")
            .append("text")
            .attr("x", blockWidth/2)
            .attr("y", padding * 2)
            .attr("text-anchor", "middle")
            .attr("dy", "0em")
            .text(function(d) { return d.name; })
            .attr('class',function(d) {return d.name}) //assign a class name == workflowrunID
            .on('mouseover', function(e, d){
                d3.selectAll("." + d.name).transition()
                    .duration('50');})
            .on('mouseout', function(e, d){
                d3.selectAll("." + d.name).transition()
                    .attr("stroke-width", 1)
                    .duration('50'); });
        
        //Add text - Current Running Protocol
        svg.selectAll("g")
            .append("text")
            .attr("x", blockWidth/2)
            .attr("y", blockHeight/2)
            .attr("text-anchor", "middle")
            .attr("dy", "1em")
            .text(function(d) { return d.protocols[0]; })
            .attr('class',function(d) {return d.name}) //assign a class name == workflowrunID
            .on('mouseover', function(e, d){
                d3.selectAll("." + d.name).transition()
                    .duration('50');})
            .on('mouseout', function(e, d){
                d3.selectAll("." + d.name).transition()
                    .attr("stroke-width", 1)
                    .duration('50'); });
    }

    /*
    // Generate and append workflow items to the workflow list container
    workflowsData.forEach((workflowData) => {
        const workflowItem = createWorkflowItem(workflowData);
        workflowList.appendChild(workflowItem);
    });*/

    //** Create plots **//
    createModuleStatus("module-status");
    createWorkflowQueue("workflow-queue");
    createFutureState("future-state");
    createAmbitious("ambitious");
});