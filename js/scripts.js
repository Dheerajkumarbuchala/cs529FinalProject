document.addEventListener("DOMContentLoaded", function () {
    // Get a reference to the workflow list container
    const workflowList = document.getElementById("workflow-list");

    // Simulate loading workflows from a JSON file (replace with actual data loading)
    const workflowsData = [
        { name: "Workflow 1", protocols: ["Protocol 1", "Protocol 2", "Protocol 3"] },
        { name: "Workflow 2", protocols: ["Protocol A", "Protocol B"] },
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

    // Generate and append workflow items to the workflow list container
    workflowsData.forEach((workflowData) => {
        const workflowItem = createWorkflowItem(workflowData);
        workflowList.appendChild(workflowItem);
    });
});