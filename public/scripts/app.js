const res = null;

let fetchDataPromise = fetch("/public/data/data.json")
    .then((response) => response.json())
    .then((data) => {
        //console.log(data);
        return data; // Resolve the promise with the fetched data
    })
    .catch((error) => {
        console.error("Error fetching data:", error);
    });

// Loading data
// fetch("/public/data/data.json").then((response) => {
//     response.json().then((data) => {
//         //console.log(data);
//         //fetchingData(data);
//     })
// })

// function fetchingData(data){
//     //console.log(data);
// }

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

// Style variables
const padding = 10;
const cornerRadius = 5;

// D3 functional variables
let clicked = false;
let links = [];

document.addEventListener("DOMContentLoaded", function () {
    fetchDataPromise.then((processedData) => {
        // Access the fetched data here
        console.log("Fetched data inside DOMContentLoaded:", processedData);

        //Workflow Data
        console.log('Workflows Data : ', processedData.workflows);

        //Modules data
        console.log('Modules data : ', processedData.modules);

        // Simulate loading workflows from a JSON file (replace with actual data loading)
        const workflowsData = [
            { name: "Workflow-1", protocols: [("Protocol 1", "succeeded"), ("Protocol 2", "succeeded"), ("Protocol 1", "failed")], status: "failed" },
            { name: "Workflow-2", protocols: [("Protocol A", "running"), ("Protocol B", "idle")], status: "running" },
            { name: "Workflow-3", protocols: [("Protocol X", "unknown"), ("Protocol X", "idle"), ("Protocol X", "idle")], status: "running" },
            { name: "Workflow-4", protocols: [("Protocol X", "idle"), ("Protocol X", "idle"), ("Protocol X", "idle"), ("Protocol R", "idle")], status: "queued" },
            // Add more workflow data as needed
        ];

        // Simulate loading modules from file
        const modulesData = [
            { name: "Arm", status: "ERROR", workflowRunID: "Workflow-1", locations: ["Location-1", "Location-2"] },
            { name: "Camera", status: "BUSY", workflowRunID: "Workflow-2", locations: ["Location-2", "Location-3", "Location-4"] }, 
            { name: "Liquid-Handle", status: "IDLE", workflowRunID: "None", locations: ["Location-4", "Location-5"] },
            { name: "Scope", status: "INIT", workflowRunID: "Workflow-3", locations: ["Location-6"] },
            // Add more module data as needed
        ];

        // Simulate loading locations from file
        const locationsData = [
            { name: "Location-1", workflowRunID: "Workflow-1", modules: ["Arm"] },
            { name: "Location-2", workflowRunID: null, modules: ["Arm", "Camera"] },
            { name: "Location-3", workflowRunID: "Workflow-2", modules: ["Camera"] },
            { name: "Location-4", workflowRunID: null, modules: ["Camera", "Liquid-Handle"] },
            { name: "Location-5", workflowRunID: null, modules: ["Liquid-Handle"] },
            { name: "Location-6", workflowRunID: "Workflow-3", modules: ["Scope"] },     
        ];

        //Create color scale 
        const statusColor = d3.scaleOrdinal().domain(allStatus)
            .range(["gray", "gray", "white", "white", "white", "gray", "gray", "white", "white", "red", "red", "dodgerblue", "dodgerblue"])

        const statusLineColor = d3.scaleOrdinal().domain(allStatus)
            .range(["black", "black", "black", "black", "black", "black", "black", "silver", "silver", "black", "black", "black", "black"])
        
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
            var svg = d3.select("#" + panelName + ".box").append("svg")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("width", width)
                .attr("height", height);

            return svg;
        }

        // Calculates the height and width of svg
        function calculateHeightWidthSVG(svg)
        {
            var width = svg.style("width").replace("px", "");
            var height = svg.style("height").replace("px", "");

            return [height,width];
        }

        function translateStr(x, y)
        {
            return "translate(" + x + "," + y + ")";
        }

        //** Functions to initialize panels **//
        function createModuleStatus(panelName) {
            // Get number of data items to draw
            itemNum = enumerateItem(modulesData); //using dummy data for testing

            // Create SVG size of parent div
            var svg = initSVG(panelName);
        
            // Get bounds for SVG canvas and data item elements
            var [height, width] = calculateHeightWidthSVG(svg);

            // Sizes for SVG objects        
            var [boxWidth, boxHeight] = [width/itemNum - (padding/2), height/2 - (padding/2)];
            var [moduleWidth, moduleHeight] = [(boxWidth - (padding * 3)), (boxHeight) - padding];
            var [statWidth, statHeight] = [moduleWidth/2.5, moduleHeight/2.5];

            // Create module block for each module
            svg.selectAll("g")
                .data(modulesData)
                .enter().append("g")
                .attr("id", function(d) { return d.name})
                .attr("transform", function(d, i) { 
                        return translateStr(boxWidth * i , padding)});

            // Add rectangles to show module container
            svg.selectAll("g")
                .append("rect")
                .attr('width', moduleWidth)
                .attr('height', moduleHeight)
                .attr("rx", cornerRadius)
                .attr("ry", cornerRadius)
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr("fill", "white")  
                .attr('id', function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);}) //highlight with stroke on hover
                .on('mouseout',function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                });

            // Add rectangle to show status
            svg.selectAll("g")
                .append("rect")
                .attr('width', statWidth)
                .attr('height', statHeight)
                .attr("rx", cornerRadius)
                .attr("ry", cornerRadius)
                .attr("transform", function(d) { 
                    return translateStr((moduleWidth - statWidth) - padding, padding)
                })
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr("fill", function(d) {return statusColor(d.status)})  
                .attr('id', function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);}) //highlight with stroke on hover
                .on('mouseout',function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                });

            
            // Add text - Module Name
            svg.selectAll("g")
                .append("text")
                .attr("x", padding)
                .attr("y", padding * 2)
                .attr("text-anchor", "start")
                .attr("dy", "0em")
                .text(function(d) { return d.name; })
                .attr('id',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50');})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50'); });

            // Add text - WorkflowRunID
            svg.selectAll("g")
                .append("text")
                .attr("x", padding)
                .attr("y", padding * 2)
                .attr("text-anchor", "start")
                .attr("dy", "1em")
                .text(function(d) { return d.workflowRunID; })
                .attr('id',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50');})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50'); });
            
            // Add text - status
            svg.selectAll("g")
                .append("text")
                .attr("x", (((moduleWidth - statWidth) - padding)) + statWidth/2)
                .attr("y", padding + (statHeight/2))
                .attr("text-anchor", "middle")
                .attr("dy", ".35em")
                .text(function(d) { return d.status; })
                .attr('id',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50');})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50'); });


            // Draw locations
            var locItemNum = enumerateItem(locationsData); //using dummy data for testing
            var locBoxWidth = width/locItemNum;

            var locRadius = 30;

            svg.selectAll("circle")
                .data(locationsData)
                .enter()
                .append("circle")
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("r", locRadius)
                .attr("fill", "white")
                .attr("class", "location")
                .attr("id", function(d) {return d.name; })

            locs = svg.selectAll(".location");

            locs.attr("transform", function(d,i) {
                return translateStr((locBoxWidth*i) + (padding*2) + locRadius, height/1.25 );
            });

            locs.attr("stroke", "black")
                .attr("stroke-width", function(d,i) {
                    if(d.workflowRunID == null)
                    {
                        return 1;
                    }
                    else
                    {
                        return 3;
                    }
                });

        }

        
        function createWorkflowQueue(panelName) {
            
            // Get number of data items to draw
            var itemNum = enumerateItem(workflowsData); //using dummy data for testing

            // Create SVG size of parent div
            var svg = initSVG(panelName);

            // Get bounds for SVG canvas and data item elements
            var width = svg.style("width").replace("px", "");
            var height = svg.style("height").replace("px", "");

            var [height, width] = calculateHeightWidthSVG(svg);

            var [boxHeight, boxWidth] = [40, width - padding];

            // Create status block for each workflowRunID
            svg.selectAll("g")
                .data(workflowsData)
                .enter().append("g")
                .attr("class", function(d, i) { return "workflowBox-" + i})
                .attr("transform", function(d, i) { 
                        return translateStr(padding, (boxHeight + (padding/2)) * i) });
            
            // Add rectangles for workflowRun item
            svg.selectAll("g")
                .append("rect")
                .attr("rx", cornerRadius)
                .attr("ry", cornerRadius)
                .attr('width', width - (padding + 10))
                .attr('height', boxHeight)
                .attr('stroke', 'black')
                .style('fill', "white")
                .attr('id',function(d) {return d.name}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.name)
                        .style("cursor", "pointer")
                        .transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                // Create dropdown on click
                .on("click", function(e, d){
                    clicked = !clicked;

                    var protocols = d.protocols;
                    var protocolBoxHeight = 20;
                    var fullHeight = (enumerateItem(protocols) * protocolBoxHeight) + (enumerateItem(protocols) * padding) + boxHeight;

                    var clickedItem = d3.select(this).attr('id');
                    var clickedItemID = parseInt(clickedItem.split('-')[1]);

                    if(clicked){
                        d3.select(this).transition()
                        .duration('50')
                        .attr("height", fullHeight);

                        // Move workflowRun items below the expanded workflow
                        for(var i = clickedItemID; i <= itemNum; i++)
                        {
                            //console.log("affect box .workflowBox-" + i );
                            d3.select(".workflowBox-" + i).transition()
                            .duration("50")
                            .attr("transform", function(d, j) {
                                return "translate(" + padding + "," + (((boxHeight + (padding/2)) * i) + (fullHeight-boxHeight)) + ")"});
                        }

                        // Show protocols within Workflow
                        for(var i = 0; i < enumerateItem(protocols); i++)
                        {
                            d3.select(".workflowBox-" + (clickedItemID-1))
                                .append("g")
                                .attr("class", "protocol-box")
                        }
                        
                        // Add rectangle to show protocol, color by status
                        d3.selectAll(".protocol-box")
                            .attr("transform", function(d, i) { 
                                return translateStr(boxWidth/4, boxHeight + ((protocolBoxHeight + (padding/2)) * i))})
                            .append("rect")
                            .attr("height", protocolBoxHeight)
                            .attr("width", boxWidth/2)
                            .attr("rx", cornerRadius)
                            .attr("ry", cornerRadius)
                            .attr("stroke", function(d,i){
                                return statusLineColor(protocols[i])
                            })
                            .attr('fill', function(d, i) {
                                return statusColor(protocols[i])});

                        // Add text - step number and status
                        d3.selectAll(".protocol-box")
                            .append("text")
                            .attr("x", boxWidth/4)
                            .attr("y", protocolBoxHeight/2)
                            .attr("text-anchor", "middle")
                            .attr("dy", ".35em")
                            .attr("fill", function(d,i){
                                return statusLineColor(protocols[i])
                            })
                            .text(function(d, i) { return "Step " + i + ": " + protocols[i]; })



                    }
                    if(!clicked)
                    {
                        // Collapse workflowRun item
                        d3.select(this).transition()
                        .duration('50')
                        .attr("height", boxHeight);

                        for(var i = clickedItemID; i <= itemNum; i++)
                        {
                            // Move succeeding workflowRun items back to original location
                            d3.select(".workflowBox-" + i).transition()
                            .duration("50")
                            .attr("transform", function(d, j) {
                                return translateStr(padding, ((boxHeight + (padding/2)) * i))
                            });
                        }

                        d3.selectAll(".protocol-box").remove();
                        
                    }
                })
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.name)
                        .style("cursor", "default")
                        .transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                })


            // Add status marker
            svg.selectAll("g")
            .append("circle")
            .attr('cx', boxWidth - (padding * 3))
            .attr('cy', boxHeight/2)
            .attr('r', 10)
            .attr('stroke', 'black')
            .attr('stroke-width', 1.25)
            .style('fill', function(d, i) {
                return statusColor(d.status)})
            .attr('id',function(d) {return d.name}) //assign a class name == workflowrunID
            .on('mouseover', function(e, d){
                d3.selectAll("#" + d.name).transition()
                    .duration('50')
                    .attr("stroke-width", 2.5);})
            .on('mouseout', function(e, d){
                d3.selectAll("#" + d.name).transition()
                    .duration('50')
                    .attr("stroke-width", 1);
            });

            // Add text - WorkflowRunID
            svg.selectAll("g")
                .append("text")
                .attr("x", padding)
                .attr("y", boxHeight/2)
                .attr("text-anchor", "start")
                .attr("dy", ".35em")
                .text(function(d) { return d.name; })
                .attr('id', function(d) {return d.name}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.name).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.name).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                });

                // Add text - Status
                svg.selectAll("g")
                .append("text")
                .attr("x", boxWidth - padding * 5)
                .attr("y", boxHeight/2)
                .attr("text-anchor", "end")
                .attr("dy", ".35em")
                .text(function(d) { return d.status; })
                .attr('id', function(d) {return d.name}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.name).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.name).transition()
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
            var [height, width] = calculateHeightWidthSVG(svg);

            var [boxHeight, boxWidth] = [height/2 - (padding/2), width/itemNum - (padding/2)]; 

            var [moduleWidth, moduleHeight] = [(boxWidth - (padding * 3)), (boxHeight) - padding];


            // Create module block for each module
            svg.selectAll("g")
            .data(modulesData)
            .enter().append("g")
            .attr("call", function(d) {return d.name})
            .attr("transform", function(d, i) { 
                    return translateStr(boxWidth * i, padding)});

            // Add rectangles for module container
            svg.selectAll("g")
            .append("rect")
            .attr('width', moduleWidth)
            .attr('height', moduleHeight)
            .attr("rx", cornerRadius)
            .attr("ry", cornerRadius)
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr("fill", "white") 
            .attr('id', function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
            .on('mouseover', function(e, d){
                d3.selectAll("#" + d.workflowRunID).transition()
                    .duration('50')
                    .attr("stroke-width", 2.5);})
            .on('mouseout',function(e, d){
                d3.selectAll("#" + d.workflowRunID).transition()
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
            .attr('id',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
            .on('mouseover', function(e, d){
                d3.selectAll("#" + d.workflowRunID).transition()
                    .duration('50');})
            .on('mouseout', function(e, d){
                d3.selectAll("#" + d.workflowRunID).transition()
                    .duration('50'); });

            // Add text - WorkflowRunID
            svg.selectAll("g")
            .append("text")
            .attr("x", moduleWidth/2)
            .attr("y", moduleHeight/2)
            .attr("text-anchor", "middle")
            .attr("dy", "1em")
            .text(function(d) { return d.workflowRunID; })
            .attr('id',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
            .on('mouseover', function(e, d){
                d3.selectAll("#" + d.workflowRunID).transition()
                    .duration('50');})
            .on('mouseout', function(e, d){
                d3.selectAll("#" + d.workflowRunID).transition()
                    .duration('50'); });


        }

        function createAmbitious(panelName) {
            // Get number of data items to draw
            itemNum = enumerateItem(modulesData); //using dummy data for testing

            // Create SVG size of parent div
            var svg = initSVG(panelName);
        
            // Get bounds for SVG elements and data item elements
            var [height, width] = calculateHeightWidthSVG(svg);

            var [boxHeight, boxWidth] = [height - (padding/2), width/itemNum - (padding/2)];
            var [blockWidth, blockHeight] = [(boxWidth - padding), (boxHeight) - padding];


            // Create module block for each module
            svg.selectAll("g")
                .data(workflowsData)
                .enter().append("g")
                .attr("transform", function(d, i) { 
                        return translateStr(padding + (boxWidth * i), padding)});

            // Add rectangles colored by status
            svg.selectAll("g")
                .append("rect")
                .attr('width', blockWidth)
                .attr('height', blockHeight)
                .attr("rx", cornerRadius)
                .attr("ry", cornerRadius)
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr("fill", function(d) {return statusColor(d.status)}) 
                .attr('id', function(d) {return d.name}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.name).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on('mouseout',function(e, d){
                    d3.selectAll("#" + d.name).transition()
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
                .attr('id',function(d) {return d.name}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.name).transition()
                        .duration('50');})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.name).transition()
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
                .attr('id',function(d) {return d.name}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.name).transition()
                        .duration('50');})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.name).transition()
                        .attr("stroke-width", 1)
                        .duration('50'); });
        }

        //** Create plots **//
        createModuleStatus("module-status");
        createWorkflowQueue("workflow-queue");
        createFutureState("future-state");
        createAmbitious("ambitious");
    });
});