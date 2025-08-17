document.addEventListener('DOMContentLoaded', () => {
    const clientInfoArea = document.getElementById('client-info-area');
    const detailsTableHead = document.querySelector('#details-table thead');
    const detailsTableBody = document.querySelector('#details-table tbody');
    const notesTableHead = document.querySelector('#notes-table thead');
    const notesTableBody = document.querySelector('#notes-table tbody');
    const yearFilter = document.getElementById('year-filter');
    const editTasksButton = document.getElementById('edit-tasks-button');
    const finalizeYearButton = document.getElementById('finalize-year-button');
    const finalizedStatus = document.getElementById('finalized-status');

    // --- Debounce Utility ---
    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

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
    let allTaskNames = []; // Declare globally within DOMContentLoaded scope

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

        // Ensure historicalTasks object exists for safety
        sampleClient.historicalTasks = sampleClient.historicalTasks || {};

        // Check if the current year's tasks are finalized
        const isYearFinalized = !!sampleClient.historicalTasks[currentYearSelection];

        // Update button and status visibility
        if (isYearFinalized) {
            finalizedStatus.innerHTML = `<button id="unlock-year-button" class="unlock-button">${currentYearSelection}年度の項目確定を解除</button>`;
            finalizedStatus.style.display = 'inline';
            editTasksButton.style.display = 'none';
            finalizeYearButton.style.display = 'none';
            document.getElementById('unlock-year-button').addEventListener('click', unlockYearTasks);
        } else {
            finalizedStatus.style.display = 'none';
            editTasksButton.style.display = 'inline-block';
            finalizeYearButton.style.display = 'inline-block';
        }

        // Non-destructive normalization of task data
        sampleClient.monthlyTasks.forEach(monthData => {
            const tasksToEnsure = isYearFinalized 
                ? sampleClient.historicalTasks[currentYearSelection] 
                : (sampleClient.customTasks || []);
            
            tasksToEnsure.forEach(taskName => {
                if (monthData.tasks[taskName] === undefined) {
                    monthData.tasks[taskName] = false;
                }
            });
        });

        // --- Render Client Info Table ---
        const clientInfoTable = document.createElement('table');
        clientInfoTable.className = 'client-info-table';
        clientInfoTable.innerHTML = `<tbody>
            <tr><th>No.</th><th>事業所名</th><th>決算月</th></tr>
            <tr><td>${sampleClient.no}</td><td>${sampleClient.name}</td><td>${sampleClient.fiscalMonth}</td></tr>
        </tbody>`;
        clientInfoArea.appendChild(clientInfoTable);

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
        const itemHeaderCell = document.createElement('th');
        itemHeaderCell.textContent = '項目';
        taskHeaderRow.appendChild(itemHeaderCell);

        monthsToDisplay.forEach((monthStr, index) => {
            const monthHeader = document.createElement('th');
            monthHeader.textContent = monthStr;
            monthHeader.classList.add('month-header');
            monthHeader.dataset.monthIndex = index;
            if (!isYearFinalized) { // Only add listener if not finalized
                monthHeader.addEventListener('click', onMonthHeaderClick);
            } else {
                monthHeader.style.cursor = 'not-allowed';
            }
            taskHeaderRow.appendChild(monthHeader);
        });
        detailsTableHead.appendChild(taskHeaderRow);

        // --- Render Main Task Table Body ---
        allTaskNames = isYearFinalized
            ? sampleClient.historicalTasks[currentYearSelection]
            : (sampleClient.customTasks || []);

        allTaskNames.forEach(taskName => {
            const taskRow = detailsTableBody.insertRow();
            taskRow.insertCell().textContent = taskName;
            monthsToDisplay.forEach(monthStr => {
                const cell = taskRow.insertCell();
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'task-checkbox';
                if (isYearFinalized) {
                    checkbox.disabled = true;
                }
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
        notesTableHead.appendChild(taskHeaderRow.cloneNode(true));
        const urlRow = notesTableBody.insertRow();
        urlRow.insertCell().textContent = 'URL';
        const memoRow = notesTableBody.insertRow();
        memoRow.insertCell().textContent = 'メモ';

        monthsToDisplay.forEach(monthStr => {
            let targetMonthData = sampleClient.monthlyTasks.find(mt => mt.month === monthStr) || { url: '', memo: '' };
            
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

            const memoCell = memoRow.insertCell();
            const memoTextarea = document.createElement('textarea');
            memoTextarea.value = targetMonthData.memo;
            memoTextarea.placeholder = 'メモを入力';
            memoTextarea.rows = 12;
            
            const debouncedMemoSave = debounce((value) => {
                let monthDataToUpdate = sampleClient.monthlyTasks.find(mt => mt.month === monthStr);
                if (!monthDataToUpdate) {
                    monthDataToUpdate = { month: monthStr, tasks: {}, url: '', memo: '' };
                    sampleClient.monthlyTasks.push(monthDataToUpdate);
                }
                monthDataToUpdate.memo = value;
                saveData(window.clients, window.clientDetails, window.staffs);

                const originalColor = memoTextarea.style.backgroundColor;
                memoTextarea.style.backgroundColor = '#e8f5e9';
                setTimeout(() => {
                    memoTextarea.style.backgroundColor = originalColor;
                }, 500);
            }, 1500);

            memoTextarea.addEventListener('input', (e) => {
                debouncedMemoSave(e.target.value);
            });

            memoCell.appendChild(memoTextarea);
        });
    }

    function updateStatusCell(cell, monthData, taskNames) {
        if (monthData && Object.keys(monthData.tasks).length > 0) {
            const totalTasks = taskNames.length;
            if (totalTasks === 0) {
                 cell.textContent = '-';
                 cell.style.backgroundColor = '#f0f0f0';
                 return;
            }
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

    function onMonthHeaderClick(event) {
        const headerCell = event.currentTarget;
        const monthIndex = parseInt(headerCell.dataset.monthIndex);
        const monthStr = monthsToDisplay[monthIndex];

        const checkboxesInColumn = Array.from(detailsTableBody.querySelectorAll(`tr td:nth-child(${monthIndex + 2}) input[type="checkbox"]`));

        const shouldCheckAll = checkboxesInColumn.some(cb => !cb.checked);

        let monthData = sampleClient.monthlyTasks.find(mt => mt.month === monthStr);
        if (!monthData) {
            monthData = { month: monthStr, tasks: {}, url: '', memo: '' };
            sampleClient.monthlyTasks.push(monthData);
        }

        checkboxesInColumn.forEach((checkbox, rowIndex) => {
            checkbox.checked = shouldCheckAll;
            const taskName = allTaskNames[rowIndex];
            if (taskName) {
                monthData.tasks[taskName] = shouldCheckAll;
            }
        });

        updateMonthlyStatus(monthData, allTaskNames);
        saveData(window.clients, window.clientDetails, window.staffs);
    }

    function unlockYearTasks() {
        if (confirm(`表示中の年度（${currentYearSelection}年）の項目確定を解除します。解除すると、この年度のタスクリストがクライアント全体の最新リストとして設定されます。よろしいですか？`)) {
            const historicalList = sampleClient.historicalTasks[currentYearSelection];
            if (historicalList) {
                sampleClient.customTasks = [...historicalList];
            }
            delete sampleClient.historicalTasks[currentYearSelection];
            saveData(window.clients, window.clientDetails, window.staffs);
            renderDetails();
        }
    }

    yearFilter.addEventListener('change', (event) => {
        currentYearSelection = event.target.value;
        renderDetails();
    });

    finalizeYearButton.addEventListener('click', () => {
        if (confirm(`表示中の年度（${currentYearSelection}年）のタスク項目を確定します。確定後は、この年度の項目リストの変更やチェックができなくなります。よろしいですか？`)) {
            sampleClient.historicalTasks = sampleClient.historicalTasks || {};
            sampleClient.historicalTasks[currentYearSelection] = [...(sampleClient.customTasks || [])];
            saveData(window.clients, window.clientDetails, window.staffs);
            renderDetails();
        }
    });

    // --- Modal Logic ---
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