document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Element Selectors ---
    const pageTitle = document.querySelector('h1');
    const clientNameDisplay = document.getElementById('client-name-display');
    const clientNoInput = document.getElementById('client-no');
    const clientNameInput = document.getElementById('client-name');
    const staffSelect = document.getElementById('staff-select');
    const fiscalMonthSelect = document.getElementById('fiscal-month');
    const accountingMethodSelect = document.getElementById('accounting-method');
    const saveButton = document.getElementById('save-button');

    // --- State Variables ---
    const API_BASE_URL = 'http://localhost:5001/api';
    const urlParams = new URLSearchParams(window.location.search);
    // URLパラメータの'no'をclient_idとして扱う
    const clientId = urlParams.get('no') ? parseInt(urlParams.get('no')) : null;
    const isNewMode = clientId === null;
    let currentClient = null;
    let staffs = [];

    // --- Initialization ---
    async function initializeApp() {
        try {
            staffs = await fetchStaffs();
            if (isNewMode) {
                initializeNewMode();
            } else {
                await initializeEditMode();
            }
            // ドロップダウンの初期化は、値設定後に行う
            initializeAllCustomDropdowns(); 
            saveButton.addEventListener('click', saveDataHandler);
        } catch (error) {
            console.error("Initialization failed:", error);
            pageTitle.textContent = 'エラー';
            document.getElementById('edit-form').innerHTML = '<p>ページの初期化中にエラーが発生しました。</p>';
        }
    }

    // --- Data Fetching ---
    async function fetchStaffs() {
        try {
            const response = await fetch(`${API_BASE_URL}/staffs`);
            if (!response.ok) throw new Error('担当者リストの取得に失敗しました。');
            return await response.json();
        } catch (error) {
            console.error(error);
            // エラーが発生した場合、空の配列を返し、後続処理でエラーとして扱う
            return [];
        }
    }

    async function fetchClientDetails(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/clients/${id}`);
            if (response.status === 404) return null; // Not Found
            if (!response.ok) throw new Error('顧客詳細の取得に失敗しました。');
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    // --- Mode Initializers ---
    function initializeNewMode() {
        pageTitle.textContent = '顧客新規登録';
        pageTitle.style.color = 'red';
        clientNameDisplay.style.display = 'none';
        clientNoInput.readOnly = false; // 新規登録時はNo.を入力可能にする
        populateStaffDropdown(); // 担当者ドロップダウンを先に生成
    }

    async function initializeEditMode() {
        currentClient = await fetchClientDetails(clientId);
        if (currentClient) {
            pageTitle.textContent = '顧客情報編集';
            clientNameDisplay.textContent = currentClient.name;
            clientNoInput.value = currentClient.id; // APIからは 'id' で返ってくる
            clientNoInput.readOnly = true; // 既存クライアントのNo.は編集不可
            clientNameInput.value = currentClient.name;
            
            // 担当者ドロップダウンを生成し、現在の担当者を選択状態にする
            populateStaffDropdown(currentClient.staff_id);

            // 決算月と経理方式を設定
            fiscalMonthSelect.value = `${currentClient.fiscal_month}月`;
            accountingMethodSelect.value = currentClient.accounting_method;

        } else {
            pageTitle.textContent = 'エラー';
            document.getElementById('edit-form').innerHTML = '<p>指定されたクライアントが見つかりません。</p>';
            saveButton.disabled = true;
        }
    }

    // --- Helper Functions ---
    function populateStaffDropdown(selectedStaffId = null) {
        staffSelect.innerHTML = '<option value="">選択してください</option>';
        staffs.forEach(staff => {
            const option = document.createElement('option');
            option.value = staff.id; // APIの担当者IDは 'id'
            option.textContent = staff.name;
            // selectedStaffIdがnullでない、かつ現在のstaff.idと一致する場合に選択
            if (selectedStaffId !== null && staff.id === selectedStaffId) {
                option.selected = true;
            }
            staffSelect.appendChild(option);
        });
    }

    function initializeAllCustomDropdowns() {
        document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
            const select = wrapper.querySelector('.custom-select-target');
            if (select) {
                initializeCustomDropdown(select); // from custom-dropdown.js
                const trigger = wrapper.querySelector('.custom-select-trigger');
                // 正しく選択されたオプションのテキストを表示する
                if (select.value && select.selectedIndex > -1) {
                    trigger.textContent = select.options[select.selectedIndex].textContent;
                } else {
                    trigger.textContent = select.options[0]?.textContent || '選択してください';
                }
            }
        });
    }

    // --- Save Logic ---
    async function saveDataHandler() {
        // --- Validation ---
        const clientNoValue = clientNoInput.value.trim();
        const clientData = {
            // isNewModeの場合のみidをセット
            ...(isNewMode && { id: parseInt(clientNoValue) }),
            name: clientNameInput.value.trim(),
            staff_id: parseInt(staffSelect.value),
            // "月"を取り除いて数値に変換
            fiscal_month: parseInt(fiscalMonthSelect.value.replace('月', '')),
            accounting_method: accountingMethodSelect.value,
        };

        if (isNewMode && !clientNoValue) {
            alert('No.を入力してください。');
            return;
        }
        if (isNewMode && (isNaN(clientData.id) || clientData.id <= 0)) {
            alert('No.は正の整数で入力してください。');
            return;
        }
        if (!clientData.name || !clientData.staff_id || !clientData.fiscal_month || !clientData.accounting_method) {
            alert('すべての必須項目を入力または選択してください。');
            return;
        }
        
        saveButton.disabled = true;
        saveButton.textContent = '保存中...';

        try {
            let response;
            if (isNewMode) {
                // --- Create New Client ---
                response = await fetch(`${API_BASE_URL}/clients`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientData),
                });
            } else {
                // --- Update Existing Client ---
                // 楽観ロックのため、更新前のタイムスタンプをペイロードに含める
                clientData.updated_at = currentClient.updated_at; 
                response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientData),
                });
            }

            if (response.status === 409) {
                // 編集モードでの衝突 or 新規作成でのID重複
                const errorData = await response.json();
                alert(errorData.error || 'データが競合しました。ページをリロードします。');
                window.location.reload();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '保存に失敗しました。');
            }

            const savedClient = await response.json();
            alert('保存しました！');
            // 保存後は、メインの一覧ページに遷移
            window.location.href = 'index.html';

        } catch (error) {
            alert(`エラー: ${error.message}`);
            saveButton.disabled = false;
            saveButton.textContent = '保存';
        }
    }

    // --- Run Application ---
    initializeApp();
});