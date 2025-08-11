document.addEventListener('DOMContentLoaded', () => {
    const clientInfoArea = document.getElementById('client-info-area');
    const detailsTableHead = document.querySelector('#details-table thead');
    const detailsTableBody = document.querySelector('#details-table tbody');
    const notesTableHead = document.querySelector('#notes-table thead');
    const notesTableBody = document.querySelector('#notes-table tbody');
    const yearFilter = document.getElementById('year-filter');

    // Populate year dropdown
    const currentYear = new Date().getFullYear();
    for (let year = 2025; year <= 2050; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '年';
        if (year === currentYear) { 
            option.selected = true;
        }
        yearFilter.appendChild(option);
    }
    initializeCustomDropdown(yearFilter);

    const urlParams = new URLSearchParams(window.location.search);
    const clientNo = urlParams.get('no');
    let currentYearSelection = yearFilter.value;
    let sampleClient;
    let monthsToDisplay = [];

    function renderDetails() {
        // Clear all previous content
        clientInfoArea.innerHTML = '';
        detailsTableHead.innerHTML = '';
        detailsTableBody.innerHTML = '';
        notesTableHead.innerHTML = '';
        notesTableBody.innerHTML = '';

        // Find the correct client details
        sampleClient = window.clientDetails.find(client => client.no == clientNo);

        if (!sampleClient) {
            clientInfoArea.innerHTML = '<p>クライアントデータが見つかりません。</p>';
            return;
        }

        // Normalize tasks and data structure
        sampleClient.monthlyTasks.forEach(monthData => {
            const newTasks = {};
            sampleClient.customTasks.forEach(taskName => {
                newTasks[taskName] = monthData.tasks[taskName] || false;
            });
            monthData.tasks = newTasks;
            monthData.url = monthData.url || '';
            monthData.memo = monthData.memo || '';
        });

        // --- Render Client Info Grid ---
        const infoGrid = document.createElement('div');
        infoGrid.className = 'client-info-grid';

        // Define items to display
        const items = {
            'No.': sampleClient.no,
            '事業所名': sampleClient.name,
            '決算月': sampleClient.fiscalMonth,
            '担当者': sampleClient.担当者
        };

        for (const [label, value] of Object.entries(items)) {
            const infoItem = document.createElement('div');
            infoItem.className = 'info-item';

            const infoLabel = document.createElement('span');
            infoLabel.className = 'info-label';
            infoLabel.textContent = label;

            const infoValue = document.createElement('span');
            infoValue.className = 'info-value';
            infoValue.textContent = value;

            infoItem.appendChild(infoLabel);
            infoItem.appendChild(infoValue);
            infoGrid.appendChild(infoItem);
        }

        clientInfoArea.appendChild(infoGrid);

        // --- Generate Month Headers ---
        const fiscalMonthNum = parseInt(sampleClient.fiscalMonth.replace('月', ''));
        monthsToDisplay = [];
        for (let i = 0; i < 12; i++) {
            let month = fiscalMonthNum - i;
            let year = parseInt(currentYearSelection);
            if (month <= 0) {
                month += 12;
                year--;
            }
            monthsToDisplay.unshift(`${year}年${month}月`);
        }

        const taskHeaderRow = document.createElement('tr');
        taskHeaderRow.innerHTML = '<th>項目</th>' + monthsToDisplay.map(m => `<th>${m}</th>`).join('');
        detailsTableHead.appendChild(taskHeaderRow);

        // --- Render Main Task Table Body ---
        const allTaskNames = sampleClient.customTasks || [];
        allTaskNames.forEach(taskName => {
            const taskRow = detailsTableBody.insertRow();
            taskRow.insertCell().textContent = taskName;
            monthsToDisplay.forEach(monthStr => {
                const cell = taskRow.insertCell();
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'task-checkbox';
                const targetMonthData = sampleClient.monthlyTasks.find(mt => mt.month === monthStr);
                checkbox.checked = targetMonthData ? (targetMonthData.tasks[taskName] || false) : false;

                checkbox.addEventListener('change', () => {
                    let monthDataToUpdate = sampleClient.monthlyTasks.find(mt => mt.month === monthStr);
                    if (!monthDataToUpdate) {
                        monthDataToUpdate = { month: monthStr, tasks: {}, url: '', memo: '' };
                        sampleClient.monthlyTasks.push(monthDataToUpdate);
                    }
                    monthDataToUpdate.tasks[taskName] = checkbox.checked;
                    updateMonthlyStatus(monthDataToUpdate, allTaskNames);
                    saveData(window.clients, window.clientDetails, window.staffs);
                });
                cell.appendChild(checkbox);
            });
        });

        // --- Render Status Row in Main Table ---
        const statusRow = detailsTableBody.insertRow();
        statusRow.insertCell().textContent = '月次ステータス';
        monthsToDisplay.forEach(monthStr => {
            const statusCell = statusRow.insertCell();
            statusCell.className = 'monthly-status';
            const targetMonthData = sampleClient.monthlyTasks.find(mt => mt.month === monthStr);
            updateStatusCell(statusCell, targetMonthData, allTaskNames);
        });

        // --- Render Notes Table ---
        notesTableHead.appendChild(taskHeaderRow.cloneNode(true)); // Clone header
        const urlRow = notesTableBody.insertRow();
        urlRow.insertCell().textContent = 'URL';
        const memoRow = notesTableBody.insertRow();
        memoRow.insertCell().textContent = 'メモ';

        monthsToDisplay.forEach(monthStr => {
            let targetMonthData = sampleClient.monthlyTasks.find(mt => mt.month === monthStr) || { url: '', memo: '' };
            
            // URL Cell
            const urlCell = urlRow.insertCell();
            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.value = targetMonthData.url;
            urlInput.placeholder = 'URLを入力';
            urlInput.addEventListener('input', (e) => {
                let monthDataToUpdate = sampleClient.monthlyTasks.find(mt => mt.month === monthStr);
                if (!monthDataToUpdate) {
                    monthDataToUpdate = { month: monthStr, tasks: {}, url: '', memo: '' };
                    sampleClient.monthlyTasks.push(monthDataToUpdate);
                }
                monthDataToUpdate.url = e.target.value;
                saveData(window.clients, window.clientDetails, window.staffs);
            });
            urlCell.appendChild(urlInput);

            // Memo Cell
            const memoCell = memoRow.insertCell();
            const memoTextarea = document.createElement('textarea');
            memoTextarea.value = targetMonthData.memo;
            memoTextarea.placeholder = 'メモを入力';
            memoTextarea.rows = 12; // Increase height
            memoTextarea.addEventListener('input', (e) => {
                let monthDataToUpdate = sampleClient.monthlyTasks.find(mt => mt.month === monthStr);
                if (!monthDataToUpdate) {
                    monthDataToUpdate = { month: monthStr, tasks: {}, url: '', memo: '' };
                    sampleClient.monthlyTasks.push(monthDataToUpdate);
                }
                monthDataToUpdate.memo = e.target.value;
                saveData(window.clients, window.clientDetails, window.staffs);
            });
            memoCell.appendChild(memoTextarea);
        });
    }

    function updateStatusCell(cell, monthData, taskNames) {
        if (monthData && Object.keys(monthData.tasks).length > 0) {
            const totalTasks = taskNames.length;
            const completedTasks = taskNames.filter(task => monthData.tasks[task]).length;
            if (totalTasks > 0 && totalTasks === completedTasks) {
                cell.textContent = '月次完了';
                cell.style.backgroundColor = '#ccffcc';
            } else if (completedTasks === 0) {
                cell.textContent = '未入力';
                cell.style.backgroundColor = '#e0e0e0';
            } else {
                const percentage = Math.round((completedTasks / totalTasks) * 100);
                cell.textContent = `${percentage}%`;
                cell.style.backgroundColor = '#ffff99';
            }
        } else {
            cell.textContent = 'データなし';
            cell.style.backgroundColor = '#f0f0f0';
        }
    }

    function updateMonthlyStatus(monthData, taskNames) {
        const monthIndex = monthsToDisplay.findIndex(m => m === monthData.month);
        if (monthIndex === -1) return;

        const statusRow = detailsTableBody.querySelector('tr:last-child');
        const statusCell = statusRow.cells[monthIndex + 1];
        updateStatusCell(statusCell, monthData, taskNames);
    }

    yearFilter.addEventListener('change', (event) => {
        currentYearSelection = event.target.value;
        renderDetails();
    });

    // --- Modal Logic (remains the same) ---
    const editTasksButton = document.getElementById('edit-tasks-button');
    const taskEditModal = document.getElementById('task-edit-modal');
    const closeButton = taskEditModal.querySelector('.close-button');
    const taskListContainer = document.getElementById('task-list-container');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskButton = document.getElementById('add-task-button');
    const saveTasksButton = document.getElementById('save-tasks-button');
    const cancelTasksButton = document.getElementById('cancel-tasks-button');
    let currentEditingTasks = [];

    function renderTaskList(tasks) {
        taskListContainer.innerHTML = '';
        tasks.forEach((task, index) => {
            const taskItem = document.createElement('div');
            taskItem.classList.add('task-item');
            taskItem.innerHTML = `
                <input type="text" value="${task}">
                <button class="delete-task-button" data-index="${index}">削除</button>
            `;
            taskListContainer.appendChild(taskItem);
        });
    }

    editTasksButton.addEventListener('click', () => {
        currentEditingTasks = [...(sampleClient.customTasks || [])];
        renderTaskList(currentEditingTasks);
        taskEditModal.style.display = 'block';
    });

    closeButton.addEventListener('click', () => { taskEditModal.style.display = 'none'; });
    cancelTasksButton.addEventListener('click', () => { taskEditModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target === taskEditModal) { taskEditModal.style.display = 'none'; } });

    addTaskButton.addEventListener('click', () => {
        const newTaskName = newTaskInput.value.trim();
        if (newTaskName && !currentEditingTasks.includes(newTaskName)) {
            currentEditingTasks.push(newTaskName);
            renderTaskList(currentEditingTasks);
            newTaskInput.value = '';
        }
    });

    taskListContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-task-button')) {
            const index = parseInt(event.target.dataset.index);
            currentEditingTasks.splice(index, 1);
            renderTaskList(currentEditingTasks);
        }
    });

    taskListContainer.addEventListener('input', (event) => {
        if (event.target.tagName === 'INPUT') {
            const index = Array.from(taskListContainer.children).indexOf(event.target.closest('.task-item'));
            currentEditingTasks[index] = event.target.value.trim();
        }
    });

    saveTasksButton.addEventListener('click', () => {
        sampleClient.customTasks = currentEditingTasks.filter(task => task !== '');
        saveData(window.clients, window.clientDetails, window.staffs);
        taskEditModal.style.display = 'none';
        renderDetails();
    });

    // Initial Render
    renderDetails();
});