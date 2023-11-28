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
                   "BUSY", "running",         // Running   => Blue
                   "completed", "succeeded",  // Done      => Light Gray 
                   "ERROR", "failed",         // Error     => Red
                   "UNKNOWN", "unknown"];     // Unknown   => Gray

// Style variables
const padding = 10;
const cornerRadius = 5;
const markerBoxWidth = 7;
const markerBoxHeight = 7;
const refX = markerBoxWidth / 2;
const refY = markerBoxHeight / 2;
const markerWidth = markerBoxWidth / 2;
const markerHeight = markerBoxHeight / 2;
const arrowPoints = [[0, 0], [0, 7], [7, 3]];

// D3 functional variables
let clicked = false;
let selectedBoxItem = null;

document.addEventListener("DOMContentLoaded", function () {
    fetchDataPromise.then((processedData) => {
        // Access the fetched data here
        //console.log("Fetched data inside DOMContentLoaded:", processedData);

        //Workflow Data
        //console.log('Workflows Data : ', processedData.workflows);
        //Modules data
        //console.log('Modules data : ', processedData.modules);

        let modules = processedData.modules;
        let workflows = processedData.workflows;
        let locations = processedData.locations;

        //Create color scale 
        const statusColor = d3.scaleOrdinal().domain(allStatus)
            .range(["white", "white", "white", "white", "white", "#64aed7", "#64aed7", "lightgray", "lightgray", "firebrick", "firebrick", "gray", "gray"])

        const statusLineColor = d3.scaleOrdinal().domain(allStatus)
            .range(["black", "black", "black", "black", "black", "black", "black", "gray", "gray", "white", "white", "black", "black"])
            
        // Colors to distinguish WFR_ID in Future State chart
        const futureColorMap = d3.scaleLinear()
            .domain(d3.ticks(0, workflows.length, 3))
            .range(["coral", "darkseagreen", "paleturquoise"]);


        //** Panel Plots helper functions **//
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
                .attr("preserveAspectRatio", "xMidYMid meet")
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

        function getXYFromTranslate(transform){
            var split = transform.split("(")[1];

            split = split.split(",");

            var x = parseFloat(split[0]);
            var y = parseFloat(split[1].split(")")[0]);

            return [x, y];
        }

        // Used to split modules into bottom row (transfer or linkless modules) and top row (links to a transfer module)
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

        // Returns list of dictionaries containing information to draw each module
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

        // Returns moduleInfo list and a list of dictionaries containing information to draw each location
        function getLocationInfo(topRowModules, boxWidth, centerPaddingTop, width, height, locRadius, moduleHeight)
        {
           var moduleInfo =  getModuleInfo(topRowModules, boxWidth, centerPaddingTop);
           var locInfo = []; 

            //Check every workflow to see if this is a transfer step
            var isTransfer = false;

            var targetOrSource = null;

            //For every location in the state
            for(var i = 0; i < locations.length; i++)
            {
                //(x,y) of SVG where location will be drawn
                var xCoord = width - ((padding + locRadius) * 2);
                var yCoord = height/2;

                var step_num = null;

                var target = null;
                var source = null;

                //For every workflow
                for(var j = 0; j < workflows.length; j++)
                {

                    //Match location with its workflow if it has one
                    if(locations[i].workflowRunID == workflows[j].workflowRunID)
                    {
                        step_num = workflows[j].step_index;

                        //if either locations in this step == module name, its a transfer
                        var currentStep = workflows[j].steps[workflows[j].step_index];

                        target = currentStep.locations.target;
                        source = currentStep.locations.source;

                        //If there is a null here, it means there is only one location
                        if(target == null || source == null)
                        {
                            isTransfer = false;
                        }
                        else
                        {
                            isTransfer = true;
                            
                            if(locations[i].name == target)
                            {
                                targetOrSource = "target";
                            }
                            else if(locations[i].name == source)
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
                    if(moduleInfo[j].name == locations[i].name.split('.')[0])
                    {
                        xCoord = moduleInfo[j].x + (((boxWidth- (padding * 3)) - ((locRadius*2) * moduleInfo[j].locNum))/2);
                        yCoord = moduleInfo[j].y + (moduleHeight/1.25);
                    }

                    // If a module has multiple locations, move location coordinates
                    for(var k = 0; k < locInfo.length; k++)
                    {
                        if(locInfo.length != 0 && locInfo[k].name.split('.')[0] == locations[i].name.split('.')[0])
                        {
                            xCoord += (locRadius*2);
                        }
                    }

                }

                locInfo.push({
                    "name" : locations[i].name,
                    "x" : xCoord,
                    "y" : yCoord,
                    "parentNum" : locations[i].parent_modules.length,
                    "workflowRunID" : locations[i].workflowRunID,
                    "stepNum": step_num,
                    "isTransferStep" : isTransfer, 
                    "targetOrSource": targetOrSource, 
                    "target": target,
                    "source": source,
                });
            }

            return [moduleInfo, locInfo];
        }

        // Returns list of dictionaries containing information to draw each transfer module location/link
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

        function createNextStepLocationInfo(locInfo, upNextLocs)
        {
            for(var i = 0; i < locInfo.length; i++)
            {
                var step_num = null;

                var target = null;
                var source = null;

                var nextWfrID;

                //For every workflow
                for(var j = 0; j < workflows.length; j++)
                {
                    //Match location with its workflow if it has one
                    if(locations[i].workflowRunID == workflows[j].workflowRunID)
                    {
                        step_num = workflows[j].step_index + 1;

                        //if either locations in this step == module name, its a transfer
                        var nextStep = workflows[j].steps[workflows[j].step_index + 1];

                        target = nextStep.locations.target;
                        source = nextStep.locations.source;

                        if(target == null || source == null)
                        {
                            isTransfer = false;
                        }
                        else
                        {
                            isTransfer = true;
                            
                            if(locations[i].name == target)
                            {
                                targetOrSource = "target";
                            }
                            else if(locations[i].name == source)
                            {
                                targetOrSource = "source";
                            }
                            else{
                                targetOrSource = null;
                            }
                        }
                    }
                }
                
                for(var j = 0; j < upNextLocs.length; j++)
                {
                    if(locInfo[i].name == upNextLocs[j].target)
                    {
                        nextWfrID = upNextLocs[j].workflowRunID;
                    }
                }

                locInfo[i].stepNum = step_num;
                locInfo[i].isTransferStep = isTransfer;
                locInfo[i].targetOrSource = targetOrSource;
                locInfo[i].target = target;
                locInfo[i].source = source;
                locInfo[i].workflowRunID = nextWfrID;
            }

            return locInfo;
        }


        function calculateArrowPosition(d) {
            // Assuming the arrow is centered within the element
            var arrowWidth = 10; // Adjust this based on your arrow's width
            var arrowHeight = 5; // Adjust this based on your arrow's height
        
            var x = -(arrowWidth / 2); // Center the arrow horizontally
            var y = arrowHeight; // Offset vertically, adjust as needed
        
            return { x, y };
        }        

        /** PANELS **/
        function createModuleStatusNetwork(panelName)
        {
            // Create SVG size of parent div
            var svg = initSVG(panelName);
        
            // Get bounds for SVG canvas and data item elements
            var [height, width] = calculateHeightWidthSVG(svg);

            // Split modules for linking
            var [topRowModules, bottomRowModules] = getRowModules(modules);

            // Calculate sizes of draw elements
            var [topLen, bottomLen] = [topRowModules.length, bottomRowModules.length];
            var [boxWidth, boxHeight] = [width/(Math.max(topLen, bottomLen)) - (padding/2), height/2.5 - (padding/2)];
            var [moduleWidth, moduleHeight] = [(boxWidth - (padding * 3)), (boxHeight) - padding];
            var [statWidth, statHeight] = [moduleWidth/2.5, moduleHeight/2.5];

            // Used to center each row
            var [centerPaddingTop, centerPaddingBottom] = [(width - (boxWidth*topLen))/2, (width - (boxWidth*bottomLen))/2];

            // Size of location glyph
            var locRadius = 15;

            // Get module and location info lists
            var [moduleInfo, locInfo] = getLocationInfo(topRowModules, boxWidth, centerPaddingTop, width, height, locRadius, moduleHeight);

            // If a transfer module is present, get info list
            var transferInfo = [];
            if(bottomRowModules.length > 1)
            {
                transferInfo = getTransferModuleCoords(bottomRowModules, boxWidth, height, boxHeight, centerPaddingBottom, locRadius);
            }

            // create a tooltip
            let tooltip = d3.select("#" + panelName)
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "lightgray")
            .attr("text-anchor", "middle")
            .style("border", "solid")
            .style("border-color", "white")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px")

            //** DRAW TOP ROW **//
            // Create module block for each module
            svg.selectAll("g").remove();
            svg.selectAll("g")
                .data(topRowModules)
                .enter()
                .append("g")
                .attr("class", "topModule")
                 
            var topRowSVG = svg.selectAll(".topModule")
                .attr("transform", function(d, i) { 
                        return translateStr((boxWidth * i) + centerPaddingTop, padding)})
                .on('mouseover', function(e, d){ 
                    let [x,y] = d3.pointer(e, d3.select(".container").node());

                    tooltip.transition()
                    .duration("50")
                    .style('opacity', 1)
                    .style("visibility", "visible")
                    .style("left", (x + 15) + "px")
                    .style("top", (y) + "px");
                })
                .on("mousemove", function(e, d){
                    let [x,y] = d3.pointer(e, d3.select(".container").node());

                    tooltip
                    .html("Module: " + d.name + "<br>" + "Workflow: " + d.workflowRunID)
                    .style("left", (x + 15) + "px")
                    .style("top", (y) + "px");
                })
                .on('mouseout',function(e, d){
                    tooltip
                    .transition()
                    .duration("50")
                    .style('opacity', 0)
                    .style("visibility", "hidden");
                });

            // Add rectangles to show module container
            topRowSVG.append("rect")
                .attr('width', moduleWidth)
                .attr('height', moduleHeight)
                .attr("rx", cornerRadius)
                .attr("ry", cornerRadius)
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr("fill", "white")  
                .attr('id', function(d) {return d.workflowRunID}) 
                .on('mouseover', function(e, d){ 
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);
                })
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
                .attr('stroke', "black")
                .attr('stroke-width', 1)
                .attr("fill", function(d) {return statusColor(d.status)})  
                .attr('id', function(d) {return d.workflowRunID}) 
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);}) 
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
                .attr("font-weight", 700)
                .text(function(d) { return d.name; })
                .attr('id',function(d) {return d.workflowRunID})
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
                .attr('id',function(d) {return d.workflowRunID})
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
                .attr('fill', function(d){ return statusLineColor(d.status)})
                .attr("dy", ".35em")
                .text(function(d) { return d.status; })
                .attr('id',function(d) {return d.workflowRunID}) 
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50');})
                .on('mouseout', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50'); });
            
            // Draw location Glyphs for modules
            svg.selectAll("g")
                .exit()
                .data(locations)
                .enter()
                .append("g")
                .attr("class", "location")

            var locationSVG = svg.selectAll(".location");

            locationSVG
                .on('mouseover', function(e, d){ 
                let [x,y] = d3.pointer(e, d3.select(".container").node());

                tooltip.transition()
                .duration("50")
                .style('opacity', 1)
                .style("visibility", "visible")
                .style("left", (x + 15) + "px")
                .style("top", (y) + "px");
            })
            .on("mousemove", function(e, d){
                let [x,y] = d3.pointer(e, d3.select(".container").node());

                tooltip
                .html("Location " + d.name + "<br>" + "is occupied by " + d.workflowRunID)
                .style("left", (x + 15) + "px")
                .style("top", (y) + "px");
            })
            .on('mouseout',function(e, d){
                tooltip
                .transition()
                .duration("50")
                .style('opacity', 0)
                .style("visibility", "hidden");
            });

            locationSVG.append("circle")
                .attr("cx", function(d, i)
                {
                    if(locInfo[i].name == d.name)
                    {
                        return locInfo[i].x
                    }
                    return 0;
                })
                .attr("cy", function(d, i)
                {
                    if(locInfo[i].name == d.name)
                    {
                        return locInfo[i].y;
                    }
                    return 0;
                })
                .attr("r", locRadius)
                .attr('stroke', 'black')
                .attr('stroke-width', function(d, i){
                    //should check location status, not wfrID
                    if(d.workflowRunID == null)
                    {
                        return 1;
                    }
                    else
                    {
                        if(locInfo[i].name == d.name)
                        {
                            if(locInfo[i].targetOrSource == "source")
                            {
                                return 3; //Highlight loctions that are the source of a transfer
                            }
                            else if(locInfo[i].targetOrSource == "target")
                            {
                                return 1;
                            }
                            else
                            {
                                return 3;
                            }
                        }
                    }
                })
                .attr("fill", "white")  
                .attr('id',function(d) {return d.name})
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
                        return translateStr((boxWidth * i) + centerPaddingBottom, padding + (height - boxHeight - padding))})
                .on('mouseover', function(e, d){ 
                    let [x,y] = d3.pointer(e, d3.select(".container").node());

                    tooltip.transition()
                    .duration("50")
                    .style('opacity', 1)
                    .style("visibility", "visible")
                    .style("left", (x + 15) + "px")
                    .style("top", (y) + "px");
                })
                .on("mousemove", function(e, d){
                    let [x,y] = d3.pointer(e, d3.select(".container").node());

                    tooltip
                    .html("Module: " + d.name + "<br>" + "Workflow: " + d.workflowRunID)
                    .style("left", (x + 15) + "px")
                    .style("top", (y) + "px");
                })
                .on('mouseout',function(e, d){
                    tooltip
                    .transition()
                    .duration("50")
                    .style('opacity', 0)
                    .style("visibility", "hidden");
                });

            
            bottomRowSVG.append("rect")
                .attr('width', moduleWidth)
                .attr('height', moduleHeight)
                .attr("rx", cornerRadius)
                .attr("ry", cornerRadius)
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr("fill", "white")  
                .attr('id', function(d) {return d.workflowRunID}) 
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);}) 
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
                .attr('id', function(d) {return d.workflowRunID}) 
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);}) 
                .on('mouseout',function(e, d){
                    d3.selectAll("#" + d.workflowRunID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                });

        
            // Add text - Module Name
            bottomRowSVG.append("text")
                .attr("x", padding)
                .attr("y", moduleHeight - (padding * 2.5))
                .attr("font-weight", 700)
                .attr("text-anchor", "start")
                .attr("dy", "0em")
                .text(function(d) { return d.name; })
                .attr('id',function(d) {return d.workflowRunID}) 
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
                .attr('id',function(d) {return d.workflowRunID}) 
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
                .attr('id',function(d) {return d.workflowRunID}) 
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
                    var name = transferInfo[i].name;
                    var workflowRunID = transferInfo[i].workflowRunID;

                    svg.append("circle")
                        .attr("cx", transferInfo[i].x)
                        .attr("cy", transferInfo[i].y)
                        .attr("r", locRadius/2)
                        .attr("fill", "black")
                        .attr("stroke", "black")
                        .attr("stroke-width", 3)
                        .attr("class", "transferLocation")
                        .on('mouseover', function(e, d){ 
                            let [x,y] = d3.pointer(e, d3.select(".container").node());
        
                            tooltip.transition()
                            .duration("50")
                            .style('opacity', 1)
                            .style("visibility", "visible")
                            .style("left", (x + 15) + "px")
                            .style("top", (y) + "px");
                        })
                        .on("mousemove", function(e, d){
                            let [x,y] = d3.pointer(e, d3.select(".container").node());
        
                            tooltip
                            .html(name + " transferring plate for " + workflowRunID)
                            .style("left", (x + 15) + "px")
                            .style("top", (y) + "px");
                        })
                        .on('mouseout',function(e, d){
                            tooltip
                            .transition()
                            .duration("50")
                            .style('opacity', 0)
                            .style("visibility", "hidden");
                        });
                }

            }

            // Create arrow marker
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
                    .attr("x2", transferInfo[0].x + (locRadius/2))
                    .attr("y2", transferInfo[0].y - (locRadius/2))
                    .attr('stroke', function(d){
                        if(d.workflowRunID != null && d.isTransferStep == true)
                        {
                            return "black";
                        }
                        else
                        {
                            return "gray";
                        }
                    })
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

                d3.selectAll(".rest")
                    .style("stroke-dasharray", ("3, 3"))

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

                d3.selectAll(".transferLocation").raise();
            }

        }
        

        function createWorkflowQueue(panelName) {
            
            // Get number of data items to draw
            var itemNum = workflows.length; //using dummy data for testing

            // Create SVG size of parent div
            var svg = initSVG(panelName);

            var [height, width] = calculateHeightWidthSVG(svg);

            var [boxHeight, boxWidth] = [40, width - padding];

            let tooltip = d3.select("#" + panelName)
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "lightgray")
            .attr("text-anchor", "middle")
            .style("border", "solid")
            .style("border-color", "white")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px")

            for(let i=0;i<3; i++){
                svg.select(".workflowBox-"+i).remove()
            }

            // Create status block for each workflowRunID
            svg.selectAll("g")
                .data(workflows)
                .enter().append("g")
                .attr("class", function(d, i) { return "workflowBox-" + i})
                .attr("transform", function(d, i) { 
                        return translateStr(padding, (boxHeight + (padding/2)) * i) })
            
            // Add rectangles for workflowRun item
            svg.selectAll("g")
                .append("rect")
                .attr("rx", cornerRadius)
                .attr("ry", cornerRadius)
                .attr('width', width - (padding + 10))
                .attr('height', boxHeight)
                .attr('stroke', 'black')
                .style('fill', "white")
                .attr("class", function(d, i) { return "workflowBox-" + i + " wfBox"})
                .attr('id',function(d) {return d.workflowRunID}) 
                .on('mouseover', function(e, d){
                    d3.selectAll("#" + d.workflowRunID)
                        .style("cursor", "pointer")
                        .transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                // Create dropdown on click
                .on("click", function(e, d){
                    tooltip
                        .transition()
                        .duration("50")
                        .style('opacity', 0)
                        .style("visibility", "hidden");

                    var steps = d.steps;
                    var stepBoxHeight = 20;
                    var fullHeight = (steps.length * stepBoxHeight) + (steps.length * padding) + boxHeight;

                    var clickedItem = d3.select(this).attr('class');
                    var clickedItemID = parseInt(clickedItem.split('-')[1]);
                    
                    if(clickedItemID === selectedBoxItem){
                        // Collapse the current
                        d3.select(`.workflowBox-${clickedItemID}`)
                            .attr("height", 40);
                        d3.select(`rect.workflowBox-${clickedItemID}`)
                            .attr("height", 40);

                        for(var i = 0; i < itemNum; i++)
                        {
                            console.log('Transulate string: ', translateStr(padding, ((boxHeight + (padding/2)) * i)))
                            // Move succeeding workflowRun items back to original location
                            d3.select(".workflowBox-" + i)
                            .attr("transform", function(d, j) {
                                return translateStr(padding, ((boxHeight + (padding/2)) * i))
                            });
                        }

                        d3.selectAll(".step-box").remove();
                        selectedBoxItem = null;
                        
                    }
                    else{
                        if(selectedBoxItem !== null){
                            // Collapse selectedBoxItem
                            console.log("Collapsing: ", d3.select(`.workflowBox-${selectedBoxItem}`))
                            d3.select(`.workflowBox-${selectedBoxItem}`)
                                .attr("height", 40);
                            
                            d3.select(`rect.workflowBox-${selectedBoxItem}`)
                                .attr("height", 40);

                            for(var i = 0; i < modules.length; i++)
                            {
                                console.log('Transulate string: ', translateStr(padding, ((boxHeight + (padding/2)) * i)))
                                // Move succeeding workflowRun items back to original location
                                d3.select(".workflowBox-" + i)
                                .attr("transform", function(d, j) {
                                    return translateStr(padding, ((boxHeight + (padding/2)) * i))
                                });
                            }

                            d3.selectAll(".step-box").remove();
                            
                            
                        }
                        // Expand clickedItem
                        d3.select(`.workflowBox-${clickedItemID}`)
                            .attr("height", fullHeight);
                        
                        d3.select(`rect.workflowBox-${clickedItemID}`)
                            .attr("height", fullHeight);
                        
                        // Move workflowRun items below the expanded workflow
                        for(var i = clickedItemID + 1; i < itemNum; i++)
                        {
                            //console.log("affect box .workflowBox-" + i );
                            d3.select(".workflowBox-" + i)
                            .attr("transform", function(d, j) {
                                var [x,y] = getXYFromTranslate(d3.select(".workflowBox-" + i).attr("transform"));                            
                                return translateStr( x, y + (fullHeight-boxHeight))});
                        }

                        // Show steps within Workflow
                        for(var i = 0; i < steps.length; i++)
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
                                return statusColor(steps[i].status)})
                            .attr("id", function(d, i) { 
                                return (steps[i].action + "-" + steps[i].module_name + "-" + steps[i].status);
                            })
                            .on('mouseover', function(e, d){ 
                                let [x,y] = d3.pointer(e, d3.select(".container").node());
            
                                tooltip.transition()
                                .duration("50")
                                .style('opacity', 1)
                                .style("visibility", "visible")
                                .style("left", (x + 15) + "px")
                                .style("top", (y) + "px");
                            })
                            .on("mousemove", function(e, d){
                                let [x,y] = d3.pointer(e, d3.select(".container").node());

                                var text = d3.select(this).attr("id");
                                var action = text.split("-")[0];
                                var name = text.split("-")[1];
                                var status = text.split("-")[2];
            
                                tooltip
                                .html(action + " on " + name + ": " + status)
                                .style("left", (x + 15) + "px")
                                .style("top", (y) + "px");
                            })
                            .on('mouseout',function(e, d){
                                tooltip
                                .transition()
                                .duration("50")
                                .style('opacity', 0)
                                .style("visibility", "hidden");
                            });
        

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
                            .attr("id", function(d, i) { 
                                return (steps[i].action + "-" + steps[i].module_name + "-" + steps[i].status);
                            })
                            .text(function(d, i) { return steps[i].step_name; })
                            .on('mouseover', function(e, d){ 
                                let [x,y] = d3.pointer(e, d3.select(".container").node());
            
                                tooltip.transition()
                                .duration("50")
                                .style('opacity', 1)
                                .style("visibility", "visible")
                                .style("left", (x + 15) + "px")
                                .style("top", (y) + "px");
                            })
                            .on("mousemove", function(e, d){
                                let [x,y] = d3.pointer(e, d3.select(".container").node());

                                var text = d3.select(this).attr("id");
                                var action = text.split("-")[0];
                                var name = text.split("-")[1];
                                var status = text.split("-")[2];
            
                                tooltip
                                .html(action + " on " + name + ": " + status)
                            })
                            .on('mouseout',function(e, d){
                                tooltip
                                .transition()
                                .duration("50")
                                .style('opacity', 0)
                                .style("visibility", "hidden");
                            });

                        selectedBoxItem = clickedItemID
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
                .text(function(d) { return d.workflowRunID + ": " + d.name; })
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
            moduleNum = modules.length; 

            // Create SVG size of parent div
            var svg = initSVG(panelName);
    
            // Get bounds for SVG canvas and data item elements
            var [height, width] = calculateHeightWidthSVG(svg);

            // create a tooltip
            let tooltip = d3.select("#" + panelName)
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "lightgray")
            .style("font-size", "12px")
            .attr("text-anchor", "middle")
            .style("border", "solid")
            .style("border-color", "white")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px")

            //get all steps
            var steps = [];

            for(var i = 0; i < workflows.length; i++)
            {
                var wfSteps = workflows[i].steps;

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
                        "workflowRunID": workflows[i].workflowRunID,
                        "step_index": j,
                        "prevModule": prevModule,
                        "currentModule": currentModule,
                        "nextModule": nextModule
                    });
                }
            }

    
            var totalStepNum = 5;
            var [boxHeight, boxWidth] = [height/moduleNum, (width-(100+padding))/totalStepNum]; 

            // Darken first column of chart to indicate it is the current step
            const BGColorMap = d3.scaleLinear()
                .domain([0,1])
                .range(["lightgray", "white"]);

            
            // Initialize cells of chart
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
                        .attr("fill", BGColorMap(j))
                        .attr("class", modules[i].name + "-" + j) 

                    cells.push({
                        "x": 100 + (padding) + (boxWidth * j),
                        "y": 0 + (boxHeight * i),
                        "id": modules[i].name + "-" + j,
                        "cellNum": i*j,
                        "occupied": false
                    })
                }
            }

            // Create module block for each module
            svg.selectAll("g")
            .data(modules)
            .enter().append("g")
            .attr("call", function(d) {return d.name})
            .attr("transform", function(d, i) { 
                    return translateStr(padding, boxHeight*i)})
            .on('mouseover', function(e, d){ 
                let [x,y] = d3.pointer(e, d3.select(".container").node());

                tooltip.transition()
                .duration("50")
                .style('opacity', 1)
                .style("visibility", "visible")
                .style("left", (x + 15) + "px")
                .style("top", (y) + "px");
            })
            .on("mousemove", function(e, d){
                let [x,y] = d3.pointer(e, d3.select(".container").node());

                var text;

                if(d.workflowRunID == null)
                {
                    text = d.name + " is currently " + d.status;
                }   
                else
                {
                    text = d.name + " is currently " + d.status + " for " + d.workflowRunID;
                }

                tooltip
                .html(text)
                .style("left", (x + 15) + "px")
                .style("top", (y) + "px");
            })
            .on('mouseout',function(e, d){
                tooltip
                .transition()
                .duration("50")
                .style('opacity', 0)
                .style("visibility", "hidden");
            });

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
            .attr("font-weight", 700)
            .text(function(d) { return d.name; })
            .attr('id', function(d) {return d.workflowRunID}) 

            //Fill in Gantt Chart
            //For every workflow, add steps to chart
            for(var i = 0; i < workflows.length; i++)
            {
                var nowSteps = workflows[i].steps.slice(workflows[i].step_index);

                var x = null;
                var y = null;

                //For each step, find lowest free cell for its module
                for(var j = 0; j < nowSteps.length; j++)
                {
                    var currentModule = nowSteps[j].module_name;
                    var currentModuleCellID = currentModule + "-" + j
                    
                    //check if cell is filled
                    for(var k = 0; k < cells.length; k++)
                    {
                        if(cells[k].id == currentModuleCellID)
                        {

                            x = cells[k].x;
                            y = cells[k].y;

                            if(cells[k].occupied == true)
                            {
                                var myModuleIndices = [];

                                //find indices for relevant module
                                for(var l = 0; l < cells.length; l++)
                                {
                                    if(cells[l].id.split('-')[0] == currentModule)
                                    {
                                        myModuleIndices.push(l);
                                    }
                                }

                                //find next available cell for this module
                                for(var l = 0; l < myModuleIndices.length; l++)
                                {
                                    if(cells[myModuleIndices[l]].occupied == false)
                                    {
                                        newID = cells[myModuleIndices[l]].id;
                                        x = cells[myModuleIndices[l]].x;
                                        y = cells[myModuleIndices[l]].y;
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
                        .attr("fill", futureColorMap(i))
                        .attr("id", workflows[i].workflowRunID)
                        .attr("class", "filled")

                    //Add label
                    svg.append("text")
                        .attr("x", x + (padding/2))
                        .attr("y", y)
                        .attr("text-anchor", "start")
                        .attr("font-size", "10px")
                        .attr("dy", "1.25em")
                        .text(function(d) { return workflows[i].workflowRunID + ": action " + nowSteps[j].action; })
                        .attr('id', function(d) {return workflows[i].workflowRunID}) 
                }
            }

            //Add hover to select workflowRunID functionality
            svg.selectAll("rect")
                .on('mouseover', function(e, d){
                    if(d3.select(this).attr("class") == "filled")
                    {
                        let [x,y] = d3.pointer(e, d3.select(".container").node());

                        tooltip.transition()
                        .duration("50")
                        .style('opacity', 1)
                        .style("visibility", "visible")
                        .style("left", (x + 15) + "px")
                        .style("top", (y) + "px");
                    }

                    d3.selectAll("#" + d3.select(this).attr("id")).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on("mousemove", function(e, d){
                    if(d3.select(this).attr("class") == "filled")
                    {
                        let [x,y] = d3.pointer(e, d3.select(".container").node());
    
                        tooltip
                        .html(d3.select(this).attr("id"))
                        .style("left", (x + 15) + "px")
                        .style("top", (y) + "px");
                    }
                })
                .on('mouseout', function(e, d){
                    if(d3.select(this).attr("class") == "filled")
                    {
                        tooltip
                        .transition()
                        .duration("50")
                        .style('opacity', 0)
                        .style("visibility", "hidden");
                    }

                    d3.selectAll("#" + d3.select(this).attr("id")).transition()
                        .duration('50')
                        .attr("stroke-width", 1) });

            svg.selectAll("text")
                .on('mouseover', function(e, d){
                    if(d3.select(this).attr("class") == "filled")
                    {
                        let [x,y] = d3.pointer(e, d3.select(".container").node());

                        tooltip.transition()
                        .duration("50")
                        .style('opacity', 1)
                        .style("visibility", "visible")
                        .style("left", (x + 15) + "px")
                        .style("top", (y) + "px");
                    }

                    d3.selectAll("#" + d3.select(this).attr("id")).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on("mousemove", function(e, d){
                    if(d3.select(this).attr("class") == "filled")
                    {
                        let [x,y] = d3.pointer(e, d3.select(".container").node());

                        tooltip
                        .html(d3.select(this).attr("id"))
                        .style("left", (x + 15) + "px")
                        .style("top", (y) + "px");
                    }
                })
                .on('mouseout', function(e, d){
                    if(d3.select(this).attr("class") == "filled")
                    {
                        tooltip
                        .transition()
                        .duration("50")
                        .style('opacity', 0)
                        .style("visibility", "hidden");
                    }

                    d3.selectAll("#" + d3.select(this).attr("id")).transition()
                        .duration('50')
                        .attr("stroke-width", 1) });

        }

        function createFutureMap(panelName) 
        {
            // Create SVG size of parent div
            var svg = initSVG(panelName);

            // Get bounds for SVG canvas and data item elements
            var [height, width] = calculateHeightWidthSVG(svg);

            // Create tooltip
            let tooltip = d3.select("#" + panelName)
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "lightgray")
            .style("font-size", "12px")
            .attr("text-anchor", "middle")
            .style("border", "solid")
            .style("border-color", "white")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px")

            // Split modules for linking
            var [topRowModules, bottomRowModules] = getRowModules(modules);

            // Calculate sizes of draw elements
            var [topLen, bottomLen] = [topRowModules.length, bottomRowModules.length];
            var [boxWidth, boxHeight] = [width/(Math.max(topLen, bottomLen)) - (padding/2), height/2.5 - (padding/2)];
            var [moduleWidth, moduleHeight] = [(boxWidth - (padding * 3)), (boxHeight) - padding];
            var [statWidth, statHeight] = [moduleWidth/2.5, moduleHeight/2.5];

            // Used to center each row
            var [centerPaddingTop, centerPaddingBottom] = [(width - (boxWidth*topLen))/2, (width - (boxWidth*bottomLen))/2];

            // Size of location glyph
            var locRadius = 8;
            var textSize = "12px";

            // Get module and location info lists
            var [moduleInfo, oldLocInfo] = getLocationInfo(topRowModules, boxWidth, centerPaddingTop, width, height, locRadius, moduleHeight);

            // If a transfer module is present, get info list
            var transferInfo = [];
            if(bottomRowModules.length > 1)
            {
                transferInfo = getTransferModuleCoords(bottomRowModules, boxWidth, height, boxHeight, centerPaddingBottom, locRadius);
            }

            var upNextLocs = [];
            //for each location, what now and what next
            for(var i = 0; i < oldLocInfo.length; i++)
            {
                for(var j = 0; j < workflows.length; j++)
                {
                    if(oldLocInfo[i].workflowRunID == workflows[j].workflowRunID)
                    {
                        //workflows[j] is this location[i]'s workflow
                        //What module/location am I running on now?
                        var currentStep = workflows[j].steps[workflows[j].step_index];

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
                        var nextStep = workflows[j].steps[(workflows[j].step_index) + 1];

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
                            "workflowRunID": workflows[j].workflowRunID, 
                            "nextStepIndex": (workflows[j].step_index) + 1
                        });
                    }
                }
            }

            //console.log(upNextLocs);

            //console.log("old loc info: ", oldLocInfo);
            locInfo = createNextStepLocationInfo(oldLocInfo, upNextLocs);
            //console.log("new loc info: ", locInfo);

            //** DRAW TOP ROW **//
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
                .attr('id', function(d) {
                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            return upNextLocs[i].workflowRunID;
                        }
                    }
                }) 
                .on('mouseover', function(e, d){ 
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on('mouseout',function(e, d){
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                });

            
            // Add text - Module Name
            topRowSVG.append("text")
                .attr("x", padding)
                .attr("y", padding * 2)
                .attr("text-anchor", "start")
                .attr("dy", "0em")
                .attr("font-weight", 700)
                .style("font-size", textSize)
                .text(function(d) { return d.name; })
                .attr('id', function(d) {
                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            return upNextLocs[i].workflowRunID;
                        }
                    }
                }) 
                .on('mouseover', function(e, d){ 
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on('mouseout',function(e, d){
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                });

            // Add text - WorkflowRunID
            topRowSVG.append("text")
                .attr("x", padding)
                .attr("y", padding * 2)
                .attr("text-anchor", "start")
                .style("font-size", textSize)
                .attr("dy", "1em")
                .text(function(d) {
                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            return upNextLocs[i].workflowRunID;
                        }
                    }
                })
                .attr('id', function(d) {
                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            return upNextLocs[i].workflowRunID;
                        }
                    }
                }) 
                .on('mouseover', function(e, d){ 
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on('mouseout',function(e, d){
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                });
            
            // Draw location Glyphs for modules
            svg.selectAll("g")
                .exit()
                .data(locations)
                .enter()
                .append("g")
                .attr("class", "location")

            var locationSVG = svg.selectAll(".location");

            locationSVG.append("circle")
                .attr("cx", function(d, i)
                {
                    if(locInfo[i].name == d.name)
                    {
                        return locInfo[i].x
                    }
                    return 0;
                })
                .attr("cy", function(d, i)
                {
                    if(locInfo[i].name == d.name)
                    {
                        return locInfo[i].y;
                    }
                    return 0;
                })
                .attr("r", locRadius)
                .attr('stroke', 'black')
                .attr('stroke-width', function(d, i){
                    var nextWfrID = null;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target)
                        {
                            nextWfrID = upNextLocs[i].workflowRunID;
                        }

                        if(d.name == upNextLocs[i].source)
                        {
                            return 3;
                        }
                    }

                    if(nextWfrID == null)
                    {
                        return 1;
                    }

                    else
                    {
                        return 3;
                    }
                })
                .attr("fill", "white")  
                .attr('id', function(d) {
                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            return upNextLocs[i].workflowRunID;
                        }
                    }
                }) 
                .attr("class", function(d){ d.name })
                .on('mouseover', function(e, d){ 
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on('mouseout',function(e, d){
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                });

            //If a location is the source of a transfer, highlight it
            /*
            for(var i = 0; i < locInfo.length; i++)
            {
                if(locInfo[i].isTransfer)
            }*/

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
                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            return upNextLocs[i].workflowRunID;
                        }
                    }
                }) 
                .on('mouseover', function(e, d){ 
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on('mouseout',function(e, d){
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                });
   
            // Add text - Module Name
            bottomRowSVG.append("text")
                .attr("x", padding)
                .attr("y", moduleHeight - (padding * 2.5))
                .attr("text-anchor", "start")
                .attr("dy", "0em")
                .attr("font-weight", 700)
                .style("font-size", textSize)
                .text(function(d) { return d.name; })
                .attr('id', function(d) {
                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            return upNextLocs[i].workflowRunID;
                        }
                    }
                }) 
                .on('mouseover', function(e, d){ 
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on('mouseout',function(e, d){
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                });


            // Add text - WorkflowRunID
            bottomRowSVG.append("text")
                .attr("x", padding)
                .attr("y", moduleHeight - (padding * 2.5))
                .attr("text-anchor", "start")
                .attr("dy", "1em")
                .style("font-size", textSize)
                .text(function(d) {
                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            return upNextLocs[i].workflowRunID;
                        }
                    }
                })
                .attr('id', function(d) {
                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            return upNextLocs[i].workflowRunID;
                        }
                    }
                }) 
                .on('mouseover', function(e, d){ 
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 2.5);})
                .on('mouseout',function(e, d){
                    var nextWfrID;

                    for(var i = 0; i < upNextLocs.length; i++)
                    {
                        if(d.name == upNextLocs[i].target.split(".")[0])
                        {
                            nextWfrID =  upNextLocs[i].workflowRunID;
                        }
                    }
                    d3.selectAll("#" + nextWfrID).transition()
                        .duration('50')
                        .attr("stroke-width", 1);
                });

            // Check if any of the upNext steps are transfer steps
            for(var i = 0; i < upNextLocs.length; i++)
            {
                if(upNextLocs[i].target.split(".")[1] == "transfer")
                {
                    svg.append("circle")
                        .attr("cx", transferInfo[i].x)
                        .attr("cy", transferInfo[i].y)
                        .attr("r", locRadius/2)
                        .attr("fill", "black")
                        .attr("stroke", "black")
                        .attr("stroke-width", 3)
                        .attr("class", "transferLocation")
                }
            }

            // Create arrow marker
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
                    .attr('stroke', "gray")
                    .attr("stroke-width", 0) 
                    .attr("class", "rest")
                    .attr('id', function(d) { return d.name })


                for(var i = 0; i < upNextLocs.length; i++)
                {
                    for(var j = 0; j < locInfo.length; j++)
                    {
                        if(upNextLocs[i].target == locInfo[j].name)
                        {
                            svg.append("line")
                                .attr("x1", locInfo[j].x)
                                .attr("y1", locInfo[j].y)
                                .attr("x2", transferInfo[0].x )
                                .attr("y2", transferInfo[0].y )
                                .attr('stroke', "black")
                                .attr("stroke-width", 2) 
                                .attr("class", "target")
                                .attr('id', function(d) { locInfo[j].name })  
                        }

                        if(upNextLocs[i].source == locInfo[j].name)
                        {
                            svg.append("line")
                            .attr("x1", locInfo[j].x)
                            .attr("y1", locInfo[j].y)
                            .attr("x2", transferInfo[0].x )
                            .attr("y2", transferInfo[0].y )
                            .attr('stroke', "black")
                            .attr("stroke-width", 2) 
                            .attr("class", "source")
                            .attr('id', function(d) { locInfo[j].name })   
                        }
                    } 
                }               
                    
                d3.selectAll(".source")
                    .attr('marker-end', 'url(#arrow)')

                d3.selectAll(".target")
                    .attr('marker-start', 'url(#arrow)')

                d3.selectAll(".rest")
                    .style("stroke-dasharray", ("3, 3"))

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

                d3.selectAll(".transferLocation").raise();
            }
    
        }

        //** Create plots **//
        createModuleStatusNetwork("module-status");
        createWorkflowQueue("workflow-queue");
        createFutureState("future-state");
        createFutureMap("future-map");
    });
});