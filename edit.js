document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selectors ---
    const pageTitle = document.querySelector('h1');
    const clientNameDisplay = document.getElementById('client-name-display');
    const clientNoInput = document.getElementById('client-no');
    const clientNameInput = document.getElementById('client-name');
    const staffSelect = document.getElementById('staff-select');
    const fiscalMonthSelect = document.getElementById('fiscal-month');
    const accountingMethodSelect = document.getElementById('accounting-method');
    const saveButton = document.getElementById('save-button');

    // --- Mode Determination ---
    const urlParams = new URLSearchParams(window.location.search);
    const clientNo = urlParams.get('no') ? parseInt(urlParams.get('no')) : null;
    const isNewMode = clientNo === null;

    let currentClient = null;

    // --- Initialization ---
    if (isNewMode) {
        initializeNewMode();
    } else {
        initializeEditMode();
    }

    // --- Mode Initializers ---
    function initializeNewMode() {
        pageTitle.textContent = '顧客新規登録';
        pageTitle.style.color = 'red'; // Set title color to red
        clientNameDisplay.style.display = 'none'; // Hide the static name display

        // Suggest the next available client number
        const maxNo = window.clients.length > 0 ? Math.max(...window.clients.map(c => c.no)) : 100;
        clientNoInput.value = maxNo + 1;

        populateDropdowns();
        initializeAllCustomDropdowns();
    }

    function initializeEditMode() {
        currentClient = window.clients.find(client => client.no === clientNo);
        if (currentClient) {
            pageTitle.textContent = '顧客情報編集';
            clientNameDisplay.textContent = currentClient.name;
            clientNoInput.value = currentClient.no;
            clientNameInput.value = currentClient.name;
            fiscalMonthSelect.value = currentClient.fiscalMonth;
            accountingMethodSelect.value = currentClient.accountingMethod;
            populateDropdowns(currentClient.担当者);
            initializeAllCustomDropdowns();
        } else {
            pageTitle.textContent = 'エラー';
            document.getElementById('edit-form').innerHTML = '<p>指定されたクライアントが見つかりません。</p>';
        }
    }

    // --- Helper Functions ---
    function populateDropdowns(selectedStaff = '') {
        // Staff Dropdown
        staffSelect.innerHTML = '<option value="">選択してください</option>'; // Add a placeholder
        window.staffs.forEach(staff => {
            const option = document.createElement('option');
            option.value = staff.name;
            option.textContent = staff.name;
            if (selectedStaff === staff.name) {
                option.selected = true;
            }
            staffSelect.appendChild(option);
        });
    }

    function initializeAllCustomDropdowns() {
        document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
            const select = wrapper.querySelector('.custom-select-target');
            if (select) {
                initializeCustomDropdown(select);
                const trigger = wrapper.querySelector('.custom-select-trigger');
                if (select.value) {
                    trigger.textContent = select.options[select.selectedIndex].textContent;
                } else {
                    // Set placeholder text if no value is selected
                    trigger.textContent = select.options[0].textContent;
                }
            }
        });
    }

    // --- Event Listeners ---
    clientNoInput.addEventListener('input', () => {
        clientNoInput.value = clientNoInput.value.replace(/[^0-9]/g, '');
    });

    saveButton.addEventListener('click', saveDataHandler);

    // --- Save Logic ---
    function saveDataHandler() {
        // --- Validation ---
        const newNo = parseInt(clientNoInput.value);
        const newName = clientNameInput.value.trim();
        const newStaff = staffSelect.value;
        const newFiscalMonth = fiscalMonthSelect.value;
        const newAccountingMethod = accountingMethodSelect.value;

        if (!newName || !newStaff || !newFiscalMonth || !newAccountingMethod) {
            alert('すべての項目を入力または選択してください。');
            return;
        }
        if (isNaN(newNo) || newNo <= 0) {
            alert('No.は正の整数で入力してください。');
            return;
        }

        // Check for unique No.
        const isNoTaken = window.clients.some(c => c.no === newNo && (isNewMode || c.no !== currentClient.no));
        if (isNoTaken) {
            alert('そのNo.は既に使用されています。別のNo.を入力してください。');
            return;
        }

        if (isNewMode) {
            // --- Create New Client ---
            const newClient = {
                no: newNo,
                name: newName,
                fiscalMonth: newFiscalMonth,
                unattendedMonths: 'N/A', // Default value
                monthlyProgress: 'N/A', // Default value
                担当者: newStaff,
                accountingMethod: newAccountingMethod,
                status: '未着手' // Default status
            };

            const newClientDetail = {
                no: newNo,
                name: newName,
                fiscalMonth: newFiscalMonth,
                担当者: newStaff,
                customTasks: ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"], // Default tasks
                monthlyTasks: [] // Initially empty
            };

            window.clients.push(newClient);
            window.clientDetails.push(newClientDetail);

        } else {
            // --- Update Existing Client ---
            const clientDetail = window.clientDetails.find(detail => detail.no === currentClient.no);
            if (clientDetail) {
                clientDetail.no = newNo;
                clientDetail.name = newName;
                clientDetail.担当者 = newStaff;
                clientDetail.fiscalMonth = newFiscalMonth;
            }

            currentClient.no = newNo;
            currentClient.name = newName;
            currentClient.担当者 = newStaff;
            currentClient.fiscalMonth = newFiscalMonth;
            currentClient.accountingMethod = newAccountingMethod;
        }

        // --- Save and Redirect ---
        saveData(window.clients, window.clientDetails, window.staffs);
        alert('保存しました！');
        window.location.href = `details.html?no=${newNo}`;
    }
});