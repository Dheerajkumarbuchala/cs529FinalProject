document.addEventListener("DOMContentLoaded", function () {
    // Get a reference to the workflow list container
    const workflowList = document.getElementById("workflow-list");

    // Load workcell state JSON from file
    /* 
    d3.json("/data/wc_state.json", function(data) {
        console.log("loading data...")
        console.log(data);
    });*/ 


    // Simulate loading workflows from a JSON file (replace with actual data loading)
    const workflowsData = [
        { name: "Workflow 1", protocols: ["Protocol 1", "Protocol 2", "Protocol 3"], size: 10 },
        { name: "Workflow 2", protocols: ["Protocol A", "Protocol B"], size: 5 },
        { name: "Workflow 3", protocols: ["Protocol X", "Protocol Y", "Protocol Z"], size: 15 },
        // Add more workflow data as needed
    ];

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

    function createD3Plot(panelName) {

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
                .attr('r', 20)
                .style('fill', 'green')
        }   

        //join circles to data 
        svg.selectAll('circle')
            .data(workflowsData)
            .join("circle")
            .attr("r", function(d) {return d.size}) //just to test the join, map radius to size field
   
    }

    // Generate and append workflow items to the workflow list container
    workflowsData.forEach((workflowData) => {
        const workflowItem = createWorkflowItem(workflowData);
        workflowList.appendChild(workflowItem);
    });

    createD3Plot("#module-status");
    createD3Plot("#workflow-queue");
    createD3Plot("#future-state");
    createD3Plot("#ambitious");
});