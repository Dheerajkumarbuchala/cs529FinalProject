const res = null;

let fetchDataPromise = fetch("/public/data/rpl_workcell_sim.json")
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
const markerBoxWidth = 5;
const markerBoxHeight = 5;
const refX = markerBoxWidth / 2;
const refY = markerBoxHeight / 2;
const markerWidth = markerBoxWidth / 2;
const markerHeight = markerBoxHeight / 2;
const arrowPoints = [[0, 0], [0, 5], [5, 2]];

// D3 functional variables
let clicked = false;


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

        const statusFutureColor = d3.scaleOrdinal().domain(allStatus)
            .range(["black", "black", "black", "black", "black", "black", "black", "black", "black", "crimson", "crimson", "black", "black"])
        
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

        function getModuleInfo(topRowModules, boxWidth, centerPaddingTop)
        {
            var moduleInfo = [];

            for(var i = 0; i < topRowModules.length; i++)
            {
                moduleInfo.push({
                    "name" : topRowModules[i].name,
                    "x" : (boxWidth * i) + centerPaddingTop,
                    "y" : padding,
                    "locNum" : topRowModules[i].locations.length
                });
            }

            return moduleInfo;
        }

        function getModuleLocationCoords(topRowModules, boxWidth, centerPaddingTop, width, height, locRadius, moduleHeight)
        {
           var moduleInfo =  getModuleInfo(topRowModules, boxWidth, centerPaddingTop);
           var locInfo = []; 

            //Check every workflow to see if this is a transfer step
            var isTransfer = false;

            var targetOrSource = null;

            //For every location in the state
            for(var i = 0; i < processedData.locations.length; i++)
            {
                var xCoord = width - ((padding + locRadius) * 2);
                var yCoord = height/2;

                var step_num = null;

                var target = null;
                var source = null;

                //For every workflow
                for(var j = 0; j < processedData.workflows.length; j++)
                {

                    //Match location with its workflow if it has one
                    if(processedData.locations[i].workflowRunID == processedData.workflows[j].workflowRunID)
                    {
                        step_num = processedData.workflows[j].step_index;

                        //if either locations in this step == module name, its a transfer
                        var currentStep = processedData.workflows[j].steps[processedData.workflows[j].step_index];

                        target = currentStep.locations.target;
                        source = currentStep.locations.source;

                        if(target == null || source == null)
                        {
                            isTransfer = false;
                        }
                        else
                        {
                            isTransfer = true;
                            
                            if(processedData.locations[i].name == target)
                            {
                                targetOrSource = "target";
                            }
                            else if(processedData.locations[i].name == source)
                            {
                                targetOrSource = "source";
                            }
                            else{
                                targetOrSource = null;
                            }
                        }
                    }
                }

                // Use module info to get (x,y) coords
                for(var j = 0; j < moduleInfo.length; j++)
                {
                    if(moduleInfo[j].name == processedData.locations[i].name.split('.')[0])
                    {
                        xCoord = moduleInfo[j].x + (((boxWidth- (padding * 3)) - ((locRadius*2) * moduleInfo[j].locNum))/2);
                        yCoord = moduleInfo[j].y + (moduleHeight/1.25);
                    }

                    // If a module has multiple locations, move location coordinates
                    for(var k = 0; k < locInfo.length; k++)
                    {
                        if(locInfo.length != 0 && locInfo[k].name.split('.')[0] == processedData.locations[i].name.split('.')[0])
                        {
                            xCoord += (locRadius*2);
                        }
                    }

                }

                locInfo.push({
                    "name" : processedData.locations[i].name,
                    "x" : xCoord,
                    "y" : yCoord,
                    "parentNum" : processedData.locations[i].parent_modules.length,
                    "workflowRunID" : processedData.locations[i].workflowRunID,
                    "stepNum": step_num,
                    "isTransferStep" : isTransfer, 
                    "targetOrSource": targetOrSource, 
                    "target": target,
                    "source": source
                });
            }

            return [moduleInfo, locInfo];
        }

        function getTransferModuleCoords(bottomRowModules, boxWidth, height, boxHeight, centerPaddingBottom, locRadius)
        {
            var transferInfo = [];

            for(var i = 0; i < bottomRowModules.length; i++)
            {
                if(bottomRowModules[i].locations.length > 0)
                {
                    transferInfo.push({
                        "name" : bottomRowModules[i].name,
                        "x" : (boxWidth * i) + centerPaddingBottom + (boxWidth/2) - locRadius,
                        "y" : padding + (height - boxHeight - padding) + (locRadius * 1.5),
                        "locNum" : bottomRowModules[i].locations.length,
                        "workflowRunID" : bottomRowModules[i].workflowRunID
                    });
                }
            }

            return transferInfo;
        }

        function createNetwork(locInfo, transferInfo)
        {
            var nodes = [];
            var links = [];

            //for each location, add it as a node
            for(var i = 0; i < locInfo.length; i++)
            {
                nodes.push({
                    "id" : locInfo[i].name,
                    "x" : locInfo[i].x,
                    "y" : locInfo[i].y,
                });
            }

            //for each transfer module, add it as a node
            for(var i = 0; i < transferInfo.length; i++)
            {
                nodes.push({
                    "id" : transferInfo[i].name,
                    "x" : transferInfo[i].x,
                    "y" : transferInfo[i].y,
                });
            }

            // create a link between the transfer nodes and all other nodes
            // modules are between 0 and locInfo.length - 1
            // transfer modules are between locInfo.length and locInfo.length + transferInfo.length

            for(var i = 0; i < locInfo.length; i++)
            {
                /*
                links.push(
                    d3.linkVertical()
                    ({
                        "source" : [nodes[i].x, nodes[i].y],
                        "target" : [nodes[locInfo.length].x, nodes[locInfo.length].y]                    
                    })
                );*/

                links.push({
                    "source" : [nodes[i].x, nodes[i].y],
                    "target" : [nodes[locInfo.length].x, nodes[locInfo.length].y]  
                });
            }

            return [nodes, links];
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

            var [topLen, bottomLen] = [enumerateItem(topRowModules), enumerateItem(bottomRowModules)];
            var [boxWidth, boxHeight] = [width/(Math.max(topLen, bottomLen)) - (padding/2), height/2.5 - (padding/2)];
            var [moduleWidth, moduleHeight] = [(boxWidth - (padding * 3)), (boxHeight) - padding];
            var [statWidth, statHeight] = [moduleWidth/2.5, moduleHeight/2.5];

            var [centerPaddingTop, centerPaddingBottom] = [(width - (boxWidth*topLen))/2, (width - (boxWidth*bottomLen))/2];

            var locRadius = 15;

            var [moduleInfo, locInfo] = getModuleLocationCoords(topRowModules, boxWidth, centerPaddingTop, width, height, locRadius, moduleHeight);

            var transferInfo = [];
            if(bottomRowModules.length > 1)
            {
                transferInfo = getTransferModuleCoords(bottomRowModules, boxWidth, height, boxHeight, centerPaddingBottom, locRadius);
            }

            var [nodes, links] = createNetwork(locInfo, transferInfo);

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

    
            // Draw links
            /*
            for (let i = 0; i < links.length; i++) 
            {
                svg
                    .append('path')
                    .attr('d', links[i])
                    .attr('stroke', 'black')
                    .attr('fill', 'none')
                    .style("stroke-width", 1.5)
                    .attr("class", "link")
            }*/

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
                    for(var i = 0; i < locInfo.length; i++)
                    {
                        if(locInfo[i].name == d.name)
                        {
                            return locInfo[i].x
                            
                        }
                    }
                    return 0;
                
                })
                .attr("cy", function(d)
                {
                    for(var i = 0; i < locInfo.length; i++)
                    {
                        if(locInfo[i].name == d.name)
                        {
                            return locInfo[i].y;
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
                        for(var i = 0; i < locInfo.length; i++)
                        {
                            if(locInfo[i].name == d.name)
                            {
                                if(locInfo[i].isTransferStep == true)
                                {
                                    return 2;
                                }
                                else
                                {
                                    return 3;
                                }
                            }
                        }
                    }
                })
                .attr("fill", "white")  
                .attr('id',function(d) {return d.name}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 1)});


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
                    return translateStr((moduleWidth - statWidth) - padding, (moduleHeight - statHeight - padding))
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
                .attr("y", moduleHeight - (padding * 2.5))
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
                .attr("y", moduleHeight - (padding * 2.5))
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
                .attr("y", (moduleHeight - statHeight - padding) + (statHeight/2))
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

            // If there is a transfer step, draw transfer module location
            //for every bottom row module
            for(var i = 0; i < transferInfo.length; i++)
            {
                if(transferInfo[i].workflowRunID != null)
                {
                    svg.append("circle")
                        .attr("cx", transferInfo[i].x)
                        .attr("cy", transferInfo[i].y)
                        .attr("r", locRadius)
                        .attr("fill", "white")
                        .attr("stroke", "black")
                        .attr("stroke-width", 3)
                }

            }

            svg
                .append('defs')
                .append('marker')
                .attr('id', 'arrow')
                .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
                .attr('refX', refX)
                .attr('refY', refY)
                .attr('markerWidth', markerBoxWidth)
                .attr('markerHeight', markerBoxHeight)
                .attr('orient', 'auto-start-reverse')
                .append('path')
                .attr('d', d3.line()(arrowPoints))
                .attr('stroke', 'black');

            // Draw All Links
            if(bottomRowModules.length > 1)
            {
                svg.selectAll("g")
                    .exit()
                    .data(locInfo)
                    .enter()
                    .append("g")
                    .attr("class", "allLink")

                var linksSVG = svg.selectAll(".allLink");

                linksSVG.append("line")
                    .attr("x1", function(d) { return d.x})
                    .attr("y1", function(d) { return d.y})
                    .attr("x2", transferInfo[0].x )
                    .attr("y2", transferInfo[0].y )
                    .attr('stroke', "black")
                    .attr("stroke-width", function(d){
                        if(d.workflowRunID != null && d.isTransferStep == true)
                        {
                            return 2;
                        }
                        else
                        {
                            return 0;
                        }
                    }) 
                    .attr("class", function(d){
                        if(d.workflowRunID != null && d.isTransferStep == true)
                        {
                            if(d.name == d.target)
                            {
                                return "target";
                            }
                            else if(d.name == d.source)
                            {
                                return "source";
                            }

                            return "active";
                        }
                        else
                        {
                            return "rest";
                        }
                    })
                    .attr('id', function(d) { return d.name })
                    
                d3.selectAll(".source")
                    .attr('marker-end', 'url(#arrow)')

                d3.selectAll(".target")
                    .attr('marker-start', 'url(#arrow)')

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

                        // Move workflowRun items below the expanded workflow
                        for(var i = clickedItemID + 1; i < itemNum; i++)
                        {
                            //console.log("affect box .workflowBox-" + i );
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
            moduleNum = enumerateItem(processedData.modules); //using dummy data for testing

            // Create SVG size of parent div
            var svg = initSVG(panelName);
    
            // Get bounds for SVG canvas and data item elements
            var [height, width] = calculateHeightWidthSVG(svg);

            //get all steps
            var steps = [];

            for(var i = 0; i < processedData.workflows.length; i++)
            {
                var wfSteps = processedData.workflows[i].steps;

                for(var j = 0; j < wfSteps.length; j++)
                {
                    var prevModule = null;
                    var currentModule = wfSteps[j].module_name;
                    var nextModule = null;

                    if(j >= 1)
                    {
                        prevModule = wfSteps[j-1].module_name;
                    }

                    if(wfSteps[j+1] != null)
                    {
                        nextModule = wfSteps[j+1].module_name;
                    }

                    steps.push({
                        "name": wfSteps[j].step_name,
                        "workflowRunID": processedData.workflows[i].workflowRunID,
                        "step_index": j,
                        "prevModule": prevModule,
                        "currentModule": currentModule,
                        "nextModule": nextModule
                    });
                }
            }

            var totalStepNum = steps.length;

            var cellNum = totalStepNum * moduleNum;
            var [boxHeight, boxWidth] = [height/moduleNum, (width-(100+padding))/totalStepNum]; 

            var cells = [];

            for(var i = 0; i < moduleNum; i++) //rows
            {
                for(var j = 0; j < totalStepNum; j++) //columns
                {
                    svg.append("rect")
                        .attr("x", 100 + (padding) + (boxWidth * j))
                        .attr("y", 0 + (boxHeight * i))
                        .attr("width", boxWidth)
                        .attr("height", boxHeight)
                        .attr("stroke", "black")
                        .attr("fill", "white")
                        .attr("class", processedData.modules[i].name + "-" + j) 

                    cells.push({
                        "x": 100 + (padding) + (boxWidth * j),
                        "y": 0 + (boxHeight * i),
                        "id": processedData.modules[i].name + "-" + j,
                        "cellNum": i*j,
                        "occupied": false
                    })
                }
            }

            // Create module block for each module
            svg.selectAll("g")
            .data(processedData.modules)
            .enter().append("g")
            .attr("call", function(d) {return d.name})
            .attr("transform", function(d, i) { 
                    return translateStr(padding, boxHeight*i)});

            // Add rectangles for module container
            svg.selectAll("g")
            .append("rect")
            .attr('width', 100)
            .attr('height', boxHeight)
            .attr("rx", cornerRadius)
            .attr("ry", cornerRadius)
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr("fill", "white") 
        
            // Add text - Module name
            svg.selectAll("g")
            .append("text")
            .attr("x", 100/2)
            .attr("y", boxHeight/2)
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .text(function(d) { return d.name; })
            .attr('id', function(d) {return d.workflowRunID}) 

            //LEFT OFF HERE
            for(var i = 0; i < processedData.workflows.length; i++)
            {
                var nowSteps = processedData.workflows[i].steps;

                for(var j = 0; j < nowSteps.length; j++)
                {
                    var currentModule = nowSteps[j].module_name;
                    var currentModuleCellID = currentModule + "-" + j
                    
                    //check if cell is filled
                    for(var k = 0; k < cells.length; k++)
                    {
                        if(cells[k].id == currentModuleCellID)
                        {
                            console.log(processedData.workflows[i].workflowRunID + " step " +  nowSteps[j].step_name + " on module " + currentModule + " will go to cell " + cells[k].id);

                            if(cells[k].occupied == true)
                            {
                                //find next available cell for this module
                                var myModuleIndices = [];

                                for(var l = 0; l < cells.length; l++)
                                {
                                    if(cells[l].id.split('-')[0] == currentModule)
                                    {
                                        myModuleIndices.push(l);
                                    }
                                }
                                //console.log(myModuleIndices);


                                for(var l = 0; l < myModuleIndices.length; l++)
                                {
                                    console.log("cells by module index ", cells[myModuleIndices[l]])

                                    if(cells[myModuleIndices[l]].occupied == false)
                                    {
                                        newID = cells[myModuleIndices[l]].id;
                                        break;
                                    }
                                }

                                currentModuleCellID = newID;
                            }
                            else
                            {
                                cells[k].occupied = true;
                            }
                        }
                    }

                    d3.select("." + currentModuleCellID)
                        .attr("fill", "gray")
                        .attr("id", processedData.workflows[i].workflowRunID)
                }
            }

            console.log(cells);

        }

        function createFutureMap(panelName) 
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

            var [centerPaddingTop, centerPaddingBottom] = [(width - (boxWidth*topLen))/2, (width - (boxWidth*bottomLen))/2];

            var locRadius = 8;

            var [moduleInfo, locInfo] = getModuleLocationCoords(topRowModules, boxWidth, centerPaddingTop, width, height, locRadius, moduleHeight);

            var transferInfo = [];
            if(bottomRowModules.length > 1)
            {
                transferInfo = getTransferModuleCoords(bottomRowModules, boxWidth, height, boxHeight, centerPaddingBottom, locRadius);
            }

            var [nodes, links] = createNetwork(locInfo, transferInfo);

            // LOCATIONS
            /*
            // Draw links
            for (let i = 0; i < links.length; i++) 
            {
                svg
                    .append('path')
                    .attr('d', links[i])
                    .attr('stroke', 'black')
                    .attr('fill', 'none')
                    .style("stroke-width", 1.5)
                    .attr("class", "link")
            }*/

            // Draw location Glyphs for modules
            svg.selectAll("g")
                .data(processedData.locations)
                .enter()
                .append("g")
                .attr("class", "location")

            var locationSVG = svg.selectAll(".location");

            var upNext = [];

            //Determine what is next 
            for (var i = 0; i < processedData.workflows.length; i++)
            {
                var nextStep = processedData.workflows[i].steps[(processedData.workflows[i].step_index) + 1];

                if(nextStep != null)
                {
                    //locations used in the next step
                    var target = nextStep.locations.target;
                    var source = nextStep.locations.source;

                    if(target != null)
                    {
                        upNext.push({
                            "name" : target,
                            "parentMod" : target.split('.')[0],
                            "workflowRunID" : processedData.workflows[i].workflowRunID,
                        });
                    }

                    if(source != null)
                    {
                        upNext.push({
                            "name" : source,
                            "parentMod" : source.split('.')[0],
                            "workflowRunID" : processedData.workflows[i].workflowRunID,
                        });
                    }

                }
            }

            var upNextLocs = [];

            //for each location, what now and what next
            for(var i = 0; i < locInfo.length; i++)
            {
                for(var j = 0; j < processedData.workflows.length; j++)
                {
                    if(locInfo[i].workflowRunID == processedData.workflows[j].workflowRunID)
                    {
                        //processedData.workflows[j] is this location[i]'s workflow
                        //What module/location am I running on now?
                        var currentStep = processedData.workflows[j].steps[processedData.workflows[j].step_index];

                        var target = currentStep.locations.target;
                        var source = currentStep.locations.source;
                        
                        var currentLoc = null;

                        if(target.split('.')[0] == currentStep.module_name)
                        {
                            currentLoc = target;
                        }
                        else if(source.split('.')[0] == currentStep.module_name)
                        {
                            currentLoc = source;
                        }
                        else
                        {
                            currentLoc = currentStep.module_name + ".transfer";
                        }

                        //What module is next?
                        var nextStep = processedData.workflows[j].steps[(processedData.workflows[j].step_index) + 1];

                        var nextLoc = null;;

                        if(nextStep != null)
                        {

                            //locations used in the next step
                            var target = nextStep.locations.target;
                            var source = nextStep.locations.source;
        
                            if(target != null && target.split('.')[0] == nextStep.module_name)
                            {
                                nextLoc = target;
                            }
                            else if(source != null && source.split('.')[0] == nextStep.module_name)
                            {
                                nextLoc = source;
                            }
                            else
                            {
                                nextLoc =  nextStep.module_name + ".transfer";
                            }
                        }

                        upNextLocs.push({
                            "source": currentLoc,
                            "target": nextLoc, 
                            "workflowRunID": processedData.workflows[j].workflowRunID
                        });
                    }
                }
            }

            console.log(upNextLocs);

            locationSVG.append("circle")
                .attr("cx", function(d)
                {
                    for(var i = 0; i < locInfo.length; i++)
                    {
                        if(locInfo[i].name == d.name)
                        {
                            return locInfo[i].x;
                        }
                    }
                    return 0;
                
                })
                .attr("cy", function(d)
                {
                    for(var i = 0; i < locInfo.length; i++)
                    {
                        if(locInfo[i].name == d.name)
                        {
                            return locInfo[i].y;
                        }
                    }

                    return 0;
                })
                .attr("r", locRadius)
                .attr('stroke', 'black')
                .attr('stroke-width', function(d){
                    for(var i = 0; i < upNext.length; i++)
                    {
                        if(d.name == upNext[i].name)
                        {
                            return 2.5;
                        }
                    }

                    return 1;
                })
                .attr("fill", function(d){
                    for(var i = 0; i < processedData.workflows.length; i++)
                    {
                        if(d.workflowRunID == processedData.workflows[i].workflowRunID)
                        {
                            if(processedData.workflows[i].status == "failed")
                            {
                                return "crimson";
                            }
                        }
                    }

                    return "white";
                })  
                .attr('id',function(d) {return d.name}) 
                .on('mouseover', function(e, d){
                    //if this location is upNext, highlight the location, its module, and the other panels.
                    if(d3.select(this).attr("class") == "upNext")
                    {
                        d3.select(this).transition()
                            .duration(50)
                            .attr("stroke-width", 2.5)
                    }

                    var wfRunId = null;

                    //get wfRunId
                    for(var i = 0; i < upNext.length; i++)
                    {
                        if(d.name == upNext[i].name)
                        {
                            wfRunId = upNext[i].workflowRunID;
                        }
                    }

                    if(wfRunId != null)
                    {
                        d3.selectAll("#" + d.wfRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);
                    }
                })
                .on('mouseout', function(e, d){
                    //if this location is upNext, highlight the location, its module, and the other panels.
                    if(d3.select(this).attr("class") == "upNext")
                    {
                        d3.select(this).transition()
                            .duration(50)
                            .attr("stroke-width", 1)
                    }

                    var wfRunId = null;

                    //get wfRunId
                    for(var i = 0; i < upNext.length; i++)
                    {
                        if(d.name == upNext[i].name)
                        {
                            wfRunId = upNext[i].workflowRunID;
                        }
                    }

                    if(wfRunId != null)
                    {
                        d3.selectAll("#" + d.wfRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                    }
                })


            // TOP ROW
            // Create module block for each module
            svg.selectAll("g")
                .exit()
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
                .attr('id', function(d) {
                    for(var i = 0; i < upNext.length; i++)
                    {
                        if(upNext[i].parentMod == d.name)
                        {
                            return upNext[i].workflowRunID;
                        }
                        return d.name;
                    } 
                }) 
                .attr("class", function(d){
                    for(var i = 0; i < upNext.length; i++)
                    {
                        if(upNext[i].parentMod == d.name)
                        {
                            return "upNext";
                        }

                        return "resting";
                    }
                })
                .on('mouseover', function(e, d){
                    if(d3.select(this).attr("class") == "upNext")
                    {
                        var wfRunID = d3.select(this).attr("id");

                        d3.selectAll("#" + wfRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);
                    }
                })
                .on('mouseout',function(e, d){
                    if(d3.select(this).attr("class") == "upNext")
                    {
                        var wfRunID = d3.select(this).attr("id");

                        d3.selectAll("#" + wfRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                    }
                });
            
            // Add text - Module Name
            topRowSVG.append("text")
                .attr("x", padding)
                .attr("y", padding * 2)
                .attr("text-anchor", "start")
                .attr("dy", "0em")
                .text(function(d) { return d.name; })
                .attr("font-size","12px")
                .attr('id',function(d) {return d.workflowRunID}) //assign a class name == workflowrunID
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50');})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50'); });

            topRowSVG.lower();
            locationSVG.raise();

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
                .attr('id', function(d) {
                    for(var i = 0; i < upNext.length; i++)
                    {
                        for(var i = 0; i < upNextLocs.length; i++)
                        {
                            if(upNextLocs[i].target == d.name)
                            {
                                return upNextLocs[i].workflowRunID;
                            }
    
                            return "resting";
                        }
                    } 
                }) 
                .attr("class", function(d){
                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(upNextLocs[i].target == d.name)
                        {
                            return "upNext";
                        }

                        return "resting";
                    }
                })
                .on('mouseover', function(e, d){
                    if(d3.select(this).attr("class") == "upNext")
                    {
                        var wfRunID = d3.select(this).attr("id");

                        d3.selectAll("#" + wfRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);
                    }
                })
                .on('mouseout',function(e, d){
                    if(d3.select(this).attr("class") == "upNext")
                    {
                        var wfRunID = d3.select(this).attr("id");

                        d3.selectAll("#" + wfRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                    }
                });

        
            // Add text - Module Name
            bottomRowSVG.append("text")
                .attr("x", padding)
                .attr("y", moduleHeight - (padding))
                .attr("text-anchor", "start")
                .attr("font-size","12px")
                .attr("dy", "0em")
                .text(function(d) { return d.name; })

            // If there is a transfer step happening, draw transfer module location

            // Draw Links
            if(bottomRowModules.length > 1)
            {
                svg.selectAll("g")
                    .exit()
                    .data(locInfo)
                    .enter()
                    .append("g")
                    .attr("class", "allLink")

                var linksSVG = svg.selectAll(".allLink");
   
                linksSVG.append("line")
                    .attr("x1", function(d) { 
                        return d.x; 
                    })
                    .attr("y1", function(d) { 
                        return d.y; 
                    })
                    .attr("x2", transferInfo[0].x)
                    .attr("y2", transferInfo[0].y)
                    .attr('stroke', "black")
                    .attr("stroke-width", function(d){
                        for(var i = 0; i < upNextLocs.length; i++)
                        {
                            if(d.name == upNextLocs[i].source)
                            {
                                return 2;
                            }
                            else if(d.name == upNextLocs[i].target)
                            {
                                return 2;
                            }
                        }
                        return 0;
                    }) 
                    .attr("class", function(d){
                        for(var i = 0; i < upNextLocs.length; i++)
                        {
                            if(d.name == upNextLocs[i].source)
                            {
                                return "source"
                            }
                            else if(d.name == upNextLocs[i].target)
                            {
                                return "target";
                            }
                        }
                        return "rest";
                    })
                    .attr('id', function(d) { return d.name + "line"})

                svg
                    .append('defs')
                    .append('marker')
                    .attr('id', 'arrow')
                    .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
                    .attr('refX', refX)
                    .attr('refY', refY)
                    .attr('markerWidth', markerBoxWidth)
                    .attr('markerHeight', markerBoxHeight)
                    .attr('orient', 'auto-start-reverse')
                    .append('path')
                    .attr('d', d3.line()(arrowPoints))
                    .attr('stroke', 'black');

                
                d3.selectAll(".source")
                    .attr('marker-end', 'url(#arrow)')

                d3.selectAll(".target")
                    .attr('marker-start', 'url(#arrow)')


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

        //** Create plots **//
        //createModuleStatus("module-status");
        createModuleStatusNetwork("module-status");
        createWorkflowQueue("workflow-queue");
        createFutureState("future-state");
        createFutureMap("future-map");
    });
});