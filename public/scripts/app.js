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

// List of all possible statuses for data items
const moduleStatus = ["INIT", "IDLE", "BUSY", "ERROR", "UNKNOWN"];
const workflowStatus = ["new", "queued", "running", "completed", "failed", "unknown"];
const stepStatus = ["idle", "running", "succeeded", "failed"]

const allStatus = ["INIT", "new",             // New Item  => Light Sky Blue
                   "IDLE", "queued", "idle",  // Empty     => White
                   "BUSY", "running",         // Running   => DodgerBlue 
                   "completed", "succeeded",  // Done      => Light Gray 
                   "ERROR", "failed",         // Error     => Red
                   "UNKNOWN", "unknown"];     // Unknown   => Gray

// Style variables
const padding = 10;
const cornerRadius = 5;
let locRadius = 15;

// D3 functional variables
let clicked = false;
let locCoords = [];
let moduleInfo = [];
let transferInfo = [];

document.addEventListener("DOMContentLoaded", function () {
    fetchDataPromise.then((processedData) => {
        // Access the fetched data here
        //console.log("Fetched data inside DOMContentLoaded:", processedData);

        //Workflow Data
        //console.log('Workflows Data : ', processedData.workflows);
        //Modules data
        //console.log('Modules data : ', processedData.modules);

        //Create color scale 
        const statusColor = d3.scaleOrdinal().domain(allStatus)
            .range(["white", "white", "white", "white", "white", "dodgerblue", "dodgerblue", "lightgray", "lightgray", "crimson", "crimson", "gray", "gray"])

        const statusLineColor = d3.scaleOrdinal().domain(allStatus)
            .range(["black", "black", "black", "black", "black", "black", "black", "silver", "silver", "black", "black", "black", "black"])
        
        //** Panel Plots helper functions **//
        function enumerateItem(data)
        {
            //return Object.keys(data).length
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

        function getRowModules(data)
        {
            //for each module, check its locations
            var topModules = [];
            var bottomModules = [];
            var belongsInTopRow = true;

            for(var i = 0; i < data.length; i++)
            {
                belongsInTopRow = true;

                for(var j = 0; j < data[i].locations.length; j++)
                {
                    //if the location is not associated with this module...
                    if(data[i].locations[j].split('.')[0] != data[i].name)
                    {
                        belongsInTopRow = false;
                    }
                }

                if(data[i].locations.length < 1)
                {
                    belongsInTopRow = false;   
                }

                if(belongsInTopRow == true)
                {
                    topModules.push(data[i]);
                }
                else
                {
                    bottomModules.push(data[i]);
                }

            }
            return [topModules, bottomModules];
        }

        function getModuleLocationCoords(topRowModules, boxWidth, centerPaddingTop, width, height)
        {
            for(var i = 0; i < topRowModules.length; i++)
            {
                moduleInfo.push({
                    "name" : topRowModules[i].name,
                    "x" : (boxWidth * i) + centerPaddingTop,
                    "y" : padding,
                    "locNum" : topRowModules[i].locations.length
                });
            }
            
            for(var i = 0; i < processedData.locations.length; i++)
            {
                var xCoord = width - ((padding + locRadius) * 2);
                var yCoord = height/2;

                for(var j = 0; j < moduleInfo.length; j++)
                {
                    if(moduleInfo[j].name == processedData.locations[i].name.split('.')[0])
                    {
                        xCoord = moduleInfo[j].x;
                        yCoord = moduleInfo[j].y;
                    }

                    for(var k = 0; k < locCoords.length; k++)
                    {
                        if(locCoords.length != 0 && locCoords[k].name.split('.')[0] == processedData.locations[i].name.split('.')[0])
                        {
                            xCoord += (locRadius*2);
                        }
                    }

                }

                locCoords.push({
                    "name" : processedData.locations[i].name,
                    "x" : xCoord,
                    "y" : yCoord,
                    "parentNum" : processedData.locations[i].parent_modules.length,
                    "workflowRunID" : processedData.locations[i].workflowRunID
                });
            }
        }

        function getTransferModuleCoords(bottomRowModules, boxWidth, height, boxHeight, centerPaddingBottom)
        {
            for(var i = 0; i < bottomRowModules.length; i++)
            {
                if(bottomRowModules[i].locations.length > 0)
                {
                    transferInfo.push({
                        "name" : bottomRowModules[i].name,
                        "x" : (boxWidth * i) + centerPaddingBottom + (boxWidth/2),
                        "y" : padding + (height - boxHeight - padding),
                        "locNum" : bottomRowModules[i].locations.length
                    });
                }
            }
        }

        // Functions to draw panel plots
        function createModuleStatusNetwork(panelName)
        {
            // Create SVG size of parent div
            var svg = initSVG(panelName);
        
            // Get bounds for SVG canvas and data item elements
            var [height, width] = calculateHeightWidthSVG(svg);

            // Split for linking
            var [topRowModules, bottomRowModules] = getRowModules(processedData.modules);

            // Calculate other bounds
            var [topLen, bottomLen] = [enumerateItem(topRowModules), enumerateItem(bottomRowModules)];
            var [boxWidth, boxHeight] = [width/(Math.max(topLen, bottomLen)) - (padding/2), height/2.5 - (padding/2)];
            var [moduleWidth, moduleHeight] = [(boxWidth - (padding * 3)), (boxHeight) - padding];
            var [statWidth, statHeight] = [moduleWidth/2.5, moduleHeight/2.5];

            var [centerPaddingTop, centerPaddingBottom] = [(width - (boxWidth*topLen))/2, (width - (boxWidth*bottomLen))/2];

            getModuleLocationCoords(topRowModules, boxWidth, centerPaddingTop, width, height);

            if(bottomRowModules.length > 1)
            {
                getTransferModuleCoords(bottomRowModules, boxWidth, height, boxHeight, centerPaddingBottom);

            }

            // TOP ROW
            // Create module block for each module
            svg.selectAll("g").remove();
            svg.selectAll("g")
                .data(topRowModules)
                .enter()
                .append("g")
                .attr("class", "topModule")
                 
            var topRowSVG = svg.selectAll(".topModule")
                .attr("transform", function(d, i) { 
                        return translateStr((boxWidth * i) + centerPaddingTop, padding)});

            // Add rectangles to show module container
            topRowSVG.append("rect")
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
            topRowSVG.append("rect")
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
            topRowSVG.append("text")
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
            topRowSVG.append("text")
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
            topRowSVG.append("text")
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

            
            // Draw location Glyphs for modules
            svg.selectAll("g")
                .exit()
                .data(processedData.locations)
                .enter()
                .append("g")
                .attr("class", "location")

            var locationSVG = svg.selectAll(".location");

            locationSVG.append("circle")
                .attr("cx", function(d)
                {
                    for(var i = 0; i < locCoords.length; i++)
                    {
                        if(locCoords[i].name == d.name)
                        {
                            if(d.parent_modules.length < 1)
                            {
                                return locCoords[i].x;
                            }

                            for(var j = 0; j < moduleInfo.length; j++)
                            {
                                if(locCoords[i].name.split('.')[0] == moduleInfo[j].name)
                                {
                                    return locCoords[i].x + ((boxWidth - ((locRadius*2) * moduleInfo[j].locNum))/2); 
                                }
                            }
                            
                        }
                    }
                    return 0;
                
                })
                .attr("cy", function(d)
                {
                    for(var i = 0; i < locCoords.length; i++)
                    {
                        if(locCoords[i].name == d.name)
                        {
                            if(d.parent_modules < 1)
                            {
                                return locCoords[i].y;
                            }
                            else
                            {
                                return locCoords[i].y + (moduleHeight/1.25);
                            }
                        }
                    }

                    return 0;
                })
                .attr("r", locRadius)
                .attr('stroke', 'black')
                .attr('stroke-width', function(d){
                    if(d.workflowRunID == null)
                    {
                        return 1;
                    }
                    else
                    {
                        return 3;
                    }
                })
                .attr("fill", "white")  
                .attr('id', function(d) { return d.name })


            // BOTTOM ROW
            svg.selectAll("g")
                .exit()
                .data(bottomRowModules)
                .enter()
                .append("g")
                .attr("class", "bottomModule")
                

            var bottomRowSVG = svg.selectAll(".bottomModule")
                .attr("transform", function(d, i) { 
                        return translateStr((boxWidth * i) + centerPaddingBottom, padding + (height - boxHeight - padding))});

            
            bottomRowSVG.append("rect")
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
            bottomRowSVG.append("rect")
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
            bottomRowSVG.append("text")
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
            bottomRowSVG.append("text")
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
            bottomRowSVG.append("text")
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

            // Draw All
            if(bottomRowModules.length > 1)
            {
                svg.selectAll("g")
                    .exit()
                    .data(locCoords)
                    .enter()
                    .append("g")
                    .attr("class", "allLink")

                var linksSVG = svg.selectAll(".allLink");

                linksSVG.append("line")
                    .attr("x1", function(d) { 
                        if(d.parentNum < 1)
                        {
                            return d.x;
                        }
                        for(var i = 0; i < moduleInfo.length; i++)
                        {
                            if(d.name.split('.')[0] == moduleInfo[i].name)
                            {
                                return d.x + ((boxWidth - ((locRadius*2) * moduleInfo[i].locNum))/2); 
                            }
                        }; 
                    })
                    .attr("y1", function(d) { 
                        if(d.parentNum < 1)
                        {
                            return d.y + locRadius;
                        }
                        else
                        {
                            return d.y + (moduleHeight/1.25) + locRadius; 
                        }; 
                    })
                    .attr("x2", transferInfo[0].x)
                    .attr("y2", transferInfo[0].y)
                    .attr('stroke', "black")
                    .attr("stroke-width", function(d){
                        if(d.workflowRunID != null)
                        {
                            return 2;
                        }
                        else
                        {
                            return 0;
                        }
                    }) 
                    .attr("class", function(d){
                        if(d.workflowRunID != null)
                        {
                            return "active";
                        }
                        else
                        {
                            return "rest";
                        }
                    })
                    .attr('id', function(d) { return d.name })

                d3.selectAll("#transferLinks")
                    .on("click", function(e,d)
                    {
                        if(transferLinks.checked)
                        {
                            d3.selectAll(".rest").transition()
                                .duration('100')
                                .attr("stroke-width", 2)
                        }
                        else
                        {

                            d3.selectAll(".rest").transition()
                                .duration('100')
                                .attr("stroke-width", 0)

                        }
                    })
            }

        }
        
        function createWorkflowQueue(panelName) {
            
            // Get number of data items to draw
            var itemNum = enumerateItem(processedData.workflows); //using dummy data for testing

            // Create SVG size of parent div
            var svg = initSVG(panelName);

            var [height, width] = calculateHeightWidthSVG(svg);

            var [boxHeight, boxWidth] = [40, width - padding];

            // Create status block for each workflowRunID
            svg.selectAll("g")
                .data(processedData.workflows)
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
                .attr("class", function(d, i) { return "workflowBox-" + i})
                .attr('id',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID)
                        .style("cursor", "pointer")
                        .transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                // Create dropdown on click
                .on("click", function(e, d){
                    clicked = !clicked;

                    var steps = d.steps;
                    var stepBoxHeight = 20;
                    var fullHeight = (enumerateItem(steps) * stepBoxHeight) + (enumerateItem(steps) * padding) + boxHeight;

                    var clickedItem = d3.select(this).attr('class');
                    var clickedItemID = parseInt(clickedItem.split('-')[1]);

                    if(clicked){
                        d3.select(this).transition()
                        .duration('50')
                        .attr("height", fullHeight);

                        console.log("hello")

                        // Move workflowRun items below the expanded workflow
                        for(var i = clickedItemID + 1; i < itemNum; i++)
                        {
                            console.log("affect box .workflowBox-" + i );
                            d3.select(".workflowBox-" + i).transition()
                            .duration("50")
                            .attr("transform", function(d, j) {
                                return "translate(" + padding + "," + (((boxHeight + (padding/2)) * i) + (fullHeight-boxHeight)) + ")"});
                        }

                        // Show steps within Workflow
                        for(var i = 0; i < enumerateItem(steps); i++)
                        {
                            d3.select(".workflowBox-" + (clickedItemID))
                                .append("g")
                                .attr("class", "step-box")
                        }
                        
                        // Add rectangle to show step, color by status
                        d3.selectAll(".step-box")
                            .attr("transform", function(d, i) { 
                                return translateStr(boxWidth/4, boxHeight + ((stepBoxHeight + (padding/2)) * i))})
                            .append("rect")
                            .attr("height", stepBoxHeight)
                            .attr("width", boxWidth/2)
                            .attr("rx", cornerRadius)
                            .attr("ry", cornerRadius)
                            .attr("stroke", function(d,i){
                                return statusLineColor(steps[i].status)
                            })
                            .attr('fill', function(d, i) {
                                return statusColor(steps[i].status)});

                        // Add text - step number and status
                        d3.selectAll(".step-box")
                            .append("text")
                            .attr("x", boxWidth/4)
                            .attr("y", stepBoxHeight/2)
                            .attr("text-anchor", "middle")
                            .attr("dy", ".35em")
                            .attr("fill", function(d,i){
                                return statusLineColor(steps[i].status)
                            })
                            .text(function(d, i) { return steps[i].step_name; })



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

                        d3.selectAll(".step-box").remove();
                        
                    }
                })
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.workflowRunID)
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
            .attr('id',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
            .on('mouseover', function(e, d){
                d3.selectAll("#" + d.workflowRunID).transition()
                    .duration('50')
                    .attr("stroke-width", 2.5);})
            .on('mouseout', function(e, d){
                d3.selectAll("#" + d.workflowRunID).transition()
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
                .attr('id', function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
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
                .attr('id', function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                });
        }

        function createFutureState(panelName) {

            // Get number of data items to draw
            itemNum = enumerateItem(processedData.modules); //using dummy data for testing

            // Create SVG size of parent div
            var svg = initSVG(panelName);
    
            // Get bounds for SVG canvas and data item elements
            var [height, width] = calculateHeightWidthSVG(svg);

            var [boxHeight, boxWidth] = [height/2 - (padding/2), width/itemNum - (padding/2)]; 

            var [moduleWidth, moduleHeight] = [(boxWidth - (padding * 3)), (boxHeight) - padding];


            // Create module block for each module
            svg.selectAll("g")
            .data(processedData.modules)
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

        function createFutureMap(panelName) {
            // Get number of data items to draw
            itemNum = enumerateItem(processedData.workflows); //using dummy data for testing

            // Create SVG size of parent div
            var svg = initSVG(panelName);
        
            // Get bounds for SVG elements and data item elements
            var [height, width] = calculateHeightWidthSVG(svg);

            var [boxHeight, boxWidth] = [height - (padding/2), width/itemNum - (padding/2)];
            var [blockWidth, blockHeight] = [(boxWidth - padding), (boxHeight) - padding];


            // Create module block for each module
            svg.selectAll("g")
                .data(processedData.workflows)
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

            
            // Add text - WorkflowRunID
            svg.selectAll("g")
                .append("text")
                .attr("x", blockWidth/2)
                .attr("y", padding * 2)
                .attr("text-anchor", "middle")
                .attr("dy", "0em")
                .text(function(d) { return d.name; })
                .attr('id',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50');})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .attr("stroke-width", 1)
                        .duration('50'); });
            
            //Add text - Current Running step
            svg.selectAll("g")
                .append("text")
                .attr("x", blockWidth/2)
                .attr("y", blockHeight/2)
                .attr("text-anchor", "middle")
                .attr("dy", "1em")
                .text(function(d) { 
                    return d.steps[d.step_index].action; })
                .attr('id',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50');})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .attr("stroke-width", 1)
                        .duration('50'); });
        }

        //** Create plots **//
        //createModuleStatus("module-status");
        createModuleStatusNetwork("module-status");
        createWorkflowQueue("workflow-queue");
        createFutureState("future-state");
        createFutureMap("future-map");
    });
});