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

    const urlParams = new URLSearchParams(window.location.search);
    const clientNo = urlParams.get('no');
    let currentYearSelection = yearFilter.value;

    // 前回選択された年度をlocalStorageから読み込む
    const lastSelectedYearKey = `lastSelectedYear_${clientNo}`;
    const storedYear = localStorage.getItem(lastSelectedYearKey);
    if (storedYear) {
        currentYearSelection = storedYear;
        yearFilter.value = storedYear;
    }
    initializeCustomDropdown(yearFilter);
    initializeCustomDropdown(yearFilter);
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

        sampleClient.historicalTasks = sampleClient.historicalTasks || {};
        const isYearFinalized = !!sampleClient.historicalTasks[currentYearSelection];

        // --- Data Structure Migration & Normalization ---
        sampleClient.monthlyTasks.forEach(monthData => {
            const tasksToEnsure = Object.keys(monthData.tasks);
            
            tasksToEnsure.forEach(taskName => {
                const taskData = monthData.tasks[taskName];
                if (taskData === undefined || taskData === null || typeof taskData === 'boolean') {
                    monthData.tasks[taskName] = { 
                        checked: !!taskData, // Converts null/undefined to false
                        note: '' 
                    };
                }
            });
        });

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

        const clientInfoTable = document.createElement('table');
        clientInfoTable.className = 'client-info-table';
        clientInfoTable.innerHTML = `<tbody>
            <tr><th>No.</th><th>事業所名</th><th>決算月</th></tr>
            <tr><td>${sampleClient.no}</td><td>${sampleClient.name}</td><td>${sampleClient.fiscalMonth}</td></tr>
        </tbody>`;
        clientInfoArea.appendChild(clientInfoTable);

        const fiscalMonthNum = parseInt(sampleClient.fiscalMonth.replace('月', ''));
        monthsToDisplay = [];
        for (let i = 0; i < 12; i++) {
            let month = fiscalMonthNum - i;
            let year = parseInt(currentYearSelection);
            if (month <= 0) { month += 12; year--; }
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
            if (!isYearFinalized) {
                monthHeader.addEventListener('click', onMonthHeaderClick);
            } else {
                monthHeader.style.cursor = 'not-allowed';
            }
            taskHeaderRow.appendChild(monthHeader);
        });
        detailsTableHead.appendChild(taskHeaderRow);

        allTaskNames = isYearFinalized
            ? sampleClient.historicalTasks[currentYearSelection]
            : (sampleClient.customTasks || []);

        allTaskNames.forEach(taskName => {
            const taskRow = detailsTableBody.insertRow();
            taskRow.insertCell().textContent = taskName;
            monthsToDisplay.forEach(monthStr => {
                const cell = taskRow.insertCell();
                cell.className = 'task-input-cell'; // Add class for styling

                let monthData = sampleClient.monthlyTasks.find(mt => mt.month === monthStr);
                if (!monthData) {
                    monthData = { month: monthStr, tasks: {}, url: '', memo: '' };
                    sampleClient.monthlyTasks.push(monthData);
                }
                if (!monthData.tasks[taskName]) {
                     monthData.tasks[taskName] = { checked: false, note: '' };
                }
                const taskData = monthData.tasks[taskName];

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'task-checkbox';
                checkbox.checked = taskData.checked;
                
                const noteInput = document.createElement('input');
                noteInput.type = 'text';
                noteInput.className = 'task-note-input';
                noteInput.value = taskData.note || '';

                if (isYearFinalized) {
                    checkbox.disabled = true;
                    noteInput.disabled = true;
                }

                // ここでセルの背景色を初期設定
                if (taskData.checked) {
                    cell.classList.add('task-completed'); // 新しいクラスを追加
                } else {
                    cell.classList.remove('task-completed');
                }

                checkbox.addEventListener('change', () => {
                    taskData.checked = checkbox.checked;
                    updateMonthlyStatus(monthData, allTaskNames);
                    sampleClient.lastUpdated = Date.now();
                    saveData(window.clients, window.clientDetails, window.staffs);

                    // チェックボックスの状態に応じてクラスをトグル
                    if (checkbox.checked) {
                        cell.classList.add('task-completed');
                    } else {
                        cell.classList.remove('task-completed');
                    }
                });

                const debouncedNoteSave = debounce(value => {
                    taskData.note = value;
                    sampleClient.lastUpdated = Date.now();
                    saveData(window.clients, window.clientDetails, window.staffs);
                }, 1000);

                noteInput.addEventListener('input', () => {
                    debouncedNoteSave(noteInput.value);
                });

                cell.appendChild(checkbox);
                cell.appendChild(noteInput);
            });
        });

        const statusRow = detailsTableBody.insertRow();
        statusRow.insertCell().textContent = '月次ステータス';
        monthsToDisplay.forEach(monthStr => {
            const statusCell = statusRow.insertCell();
            statusCell.className = 'monthly-status';
            const targetMonthData = sampleClient.monthlyTasks.find(mt => mt.month === monthStr);
            updateStatusCell(statusCell, targetMonthData, allTaskNames);
        });

        // --- Render Notes Table ---
        // Build a new header for the notes table with URL buttons
        const notesHeaderRow = document.createElement('tr');
        notesHeaderRow.insertCell().textContent = '項目';
        monthsToDisplay.forEach((monthStr, index) => {
            const th = notesHeaderRow.insertCell();
            th.style.textAlign = 'center';

            const monthText = document.createTextNode(monthStr);
            th.appendChild(monthText);
            th.appendChild(document.createElement('br'));

            const openUrlBtn = document.createElement('button');
            openUrlBtn.textContent = 'URLを開く';
            openUrlBtn.className = 'url-header-button';
            openUrlBtn.dataset.columnIndex = index + 1; // +1 for the initial '項目' cell

            openUrlBtn.addEventListener('click', (e) => {
                const colIndex = e.currentTarget.dataset.columnIndex;
                const urlInput = notesTableBody.querySelector(`tr:first-child td:nth-child(${parseInt(colIndex) + 1}) input`);
                if (urlInput) {
                    let url = urlInput.value.trim();
                    if (url) {
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            url = 'http://' + url;
                        }
                        window.open(url, '_blank', 'noopener,noreferrer');
                    }
                }
            });
            th.appendChild(openUrlBtn);
        });
        notesTableHead.appendChild(notesHeaderRow);

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
                sampleClient.lastUpdated = Date.now();
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
                sampleClient.lastUpdated = Date.now();
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
            const completedTasks = taskNames.filter(task => monthData.tasks[task] && monthData.tasks[task].checked).length;
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

        const shouldCheckAll = !allTaskNames.every(taskName => {
            const monthData = sampleClient.monthlyTasks.find(mt => mt.month === monthStr);
            return monthData && monthData.tasks[taskName] && monthData.tasks[taskName].checked;
        });

        let monthData = sampleClient.monthlyTasks.find(mt => mt.month === monthStr);
        if (!monthData) {
            monthData = { month: monthStr, tasks: {}, url: '', memo: '' };
            sampleClient.monthlyTasks.push(monthData);
        }

        allTaskNames.forEach(taskName => {
            if (!monthData.tasks[taskName]) {
                 monthData.tasks[taskName] = { checked: false, note: '' };
            }
            monthData.tasks[taskName].checked = shouldCheckAll;
        });

        renderDetails(); // Re-render to update all checkboxes and statuses at once
        sampleClient.lastUpdated = Date.now();
        saveData(window.clients, window.clientDetails, window.staffs);
    }

    function unlockYearTasks() {
        if (confirm(`表示中の年度（${currentYearSelection}年）の項目確定を解除します。解除すると、この年度のタスクリストがクライアント全体の最新リストとして設定されます。よろしいですか？`)) {
            const historicalList = sampleClient.historicalTasks[currentYearSelection];
            if (historicalList) {
                sampleClient.customTasks = [...historicalList];
            }
            delete sampleClient.historicalTasks[currentYearSelection];
            sampleClient.lastUpdated = Date.now();
            saveData(window.clients, window.clientDetails, window.staffs);
            renderDetails();
        }
    }

    yearFilter.addEventListener('change', (event) => {
        currentYearSelection = event.target.value;
        localStorage.setItem(lastSelectedYearKey, currentYearSelection);
        renderDetails();
    });

    finalizeYearButton.addEventListener('click', () => {
        if (confirm(`表示中の年度（${currentYearSelection}年）のタスク項目を確定します。確定後は、この年度の項目リストの変更やチェックができなくなります。よろしいですか？`)) {
            sampleClient.historicalTasks = sampleClient.historicalTasks || {};
            sampleClient.historicalTasks[currentYearSelection] = [...(sampleClient.customTasks || [])];
            sampleClient.lastUpdated = Date.now();
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
        sampleClient.lastUpdated = Date.now();
        saveData(window.clients, window.clientDetails, window.staffs);
        taskEditModal.style.display = 'none';
        renderDetails();
    });

    // Initial Render
    renderDetails();
});
