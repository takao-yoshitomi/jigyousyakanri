// Supabase版 - メインページスクリプト
import { SupabaseAPI, handleSupabaseError } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selectors ---
    const clientsTableBody = document.querySelector('#clients-table tbody');
    const searchInput = document.getElementById('search-input');
    const staffFilter = document.getElementById('staff-filter');
    const monthFilter = document.getElementById('month-filter');
    const clientsTableHeadRow = document.querySelector('#clients-table thead tr');
    // Staff modal elements
    const staffEditModal = document.getElementById('staff-edit-modal');
    const closeStaffModalButton = staffEditModal.querySelector('.close-button');
    const staffListContainer = document.getElementById('staff-list-container');
    const newStaffInput = document.getElementById('new-staff-input');
    const addStaffButton = document.getElementById('add-staff-button');
    const saveStaffButton = document.getElementById('save-staff-button');
    const cancelStaffButton = document.getElementById('cancel-staff-button');

    // Accordion and Default Tasks Modal elements
    const accordionHeader = document.querySelector('#management-accordion .accordion-header');
    const accordionContent = document.querySelector('#management-accordion .accordion-content');
    const defaultTasksModal = document.getElementById('default-tasks-modal');
    const openDefaultTasksModalButton = document.getElementById('default-tasks-settings-button');
    const closeDefaultTasksModalButton = defaultTasksModal.querySelector('.close-button');
    const saveDefaultTasksButton = document.getElementById('save-default-tasks-button');
    const cancelDefaultTasksButton = document.getElementById('cancel-default-tasks-button');
    const tasksKityoContainer = document.getElementById('tasks-kityo');
    const tasksJikeiContainer = document.getElementById('tasks-jikei');
    const defaultTasksContainer = defaultTasksModal.querySelector('.default-tasks-container');

    // Basic Settings Modal elements
    const basicSettingsModal = document.getElementById('basic-settings-modal');
    const openBasicSettingsModalButton = document.getElementById('basic-settings-button');
    const closeBasicSettingsModalButton = basicSettingsModal.querySelector('.close-button');
    const saveBasicSettingsButton = document.getElementById('save-basic-settings-button');
    const cancelBasicSettingsButton = document.getElementById('cancel-basic-settings-button');
    const yellowThresholdSelect = document.getElementById('yellow-threshold');
    const redThresholdSelect = document.getElementById('red-threshold');
    const yellowColorInput = document.getElementById('yellow-color');
    const redColorInput = document.getElementById('red-color');
    const fontFamilySelect = document.getElementById('font-family-select');
    const hideInactiveClientsCheckbox = document.getElementById('hide-inactive-clients');
    
    // CSV Import/Export elements
    const exportCsvButton = document.getElementById('export-csv-button');
    const importCsvButton = document.getElementById('import-csv-button');
    const csvFileInput = document.getElementById('csv-file-input');

    // Authentication elements
    const authModal = document.getElementById('auth-modal');
    const signInButton = document.getElementById('signin-button');
    const signOutButton = document.getElementById('signout-button');
    const userInfo = document.getElementById('user-info');

    // --- State Variables ---
    let clients = [];
    let staffs = [];
    let currentSortKey = 'fiscal_month';
    let currentSortDirection = 'asc';
    let originalStaffsState = [];
    let currentEditingStaffs = [];
    let defaultTasks = {}; // State for default tasks
    let appSettings = {}; // State for application settings
    let filterState = {}; // フィルター状態を保存
    let currentUser = null; // 認証ユーザー

    // --- Mappings ---
    const headerMap = {
        'No.': 'id',
        '事業所名': 'name',
        '決算月': 'fiscal_month',
        '未入力期間': 'unattendedMonths',
        '月次進捗': 'monthlyProgress',
        '最終更新': 'lastUpdated',
        '担当者': 'staff_name',
        '経理方式': 'accounting_method',
        '進捗ステータス': 'status'
    };

    // --- Authentication Functions ---
    async function checkAuth() {
        try {
            currentUser = await SupabaseAPI.getCurrentUser();
            if (currentUser) {
                updateAuthUI(true);
                await initializeApp();
            } else {
                updateAuthUI(false);
                showAuthModal();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            updateAuthUI(false);
            showAuthModal();
        }
    }

    function updateAuthUI(isAuthenticated) {
        if (isAuthenticated) {
            authModal.style.display = 'none';
            signOutButton.style.display = 'inline-block';
            userInfo.textContent = `ログイン中: ${currentUser?.email || 'ユーザー'}`;
            userInfo.style.display = 'inline-block';
            document.body.classList.remove('auth-required');
        } else {
            signOutButton.style.display = 'none';
            userInfo.style.display = 'none';
            document.body.classList.add('auth-required');
        }
    }

    function showAuthModal() {
        authModal.style.display = 'flex';
    }

    async function signIn() {
        try {
            await SupabaseAPI.signInWithGoogle();
        } catch (error) {
            console.error('Sign in error:', error);
            alert('サインインに失敗しました');
        }
    }

    async function signOut() {
        try {
            await SupabaseAPI.signOut();
            currentUser = null;
            updateAuthUI(false);
            showAuthModal();
        } catch (error) {
            console.error('Sign out error:', error);
            alert('サインアウトに失敗しました');
        }
    }

    // --- Initial Setup ---
    async function initializeApp() {
        if (!currentUser) return;
        
        setupTableHeaders();
        addEventListeners();
        populateMonthThresholds(); // Populate month dropdowns
        populateFontFamilySelect(); // Populate font family dropdown
        loadFilterState(); // フィルター状態をロード
        
        try {
            // Fetch data from Supabase
            [clients, staffs, appSettings] = await Promise.all([
                fetchClients(),
                fetchStaffs(),
                fetchSettings()
            ]);

            applyFontFamily(appSettings.font_family); // Apply font family from settings

            populateFilters();
            applyFilterState(); // 保存されたフィルター状態を適用
            renderClients();
            updateSortIcons();
        } catch (error) {
            console.error("Error initializing app:", error);
            alert("アプリケーションの初期化に失敗しました: " + handleSupabaseError(error));
        }
    }

    // --- Data Fetching Functions (Supabase版) ---
    async function fetchClients() {
        try {
            const data = await SupabaseAPI.getClients();
            // Supabaseのデータ構造に合わせて変換
            return data.map(client => ({
                ...client,
                staff_name: client.staffs?.name || '不明'
            }));
        } catch (error) {
            throw new Error(`クライアントデータの取得に失敗: ${handleSupabaseError(error)}`);
        }
    }

    async function fetchStaffs() {
        try {
            return await SupabaseAPI.getStaffs();
        } catch (error) {
            throw new Error(`スタッフデータの取得に失敗: ${handleSupabaseError(error)}`);
        }
    }

    async function fetchSettings() {
        try {
            // 複数の設定を並行取得
            const [yellowThreshold, redThreshold, yellowColor, redColor, fontFamily, hideInactiveClients] = await Promise.all([
                SupabaseAPI.getSetting('yellow_threshold').catch(() => 2),
                SupabaseAPI.getSetting('red_threshold').catch(() => 4),
                SupabaseAPI.getSetting('yellow_color').catch(() => '#fff3cd'),
                SupabaseAPI.getSetting('red_color').catch(() => '#f8d7da'),
                SupabaseAPI.getSetting('font_family').catch(() => 'Noto Sans JP'),
                SupabaseAPI.getSetting('hide_inactive_clients').catch(() => false)
            ]);

            return {
                yellow_threshold: yellowThreshold,
                red_threshold: redThreshold,
                yellow_color: yellowColor,
                red_color: redColor,
                font_family: fontFamily,
                hide_inactive_clients: hideInactiveClients
            };
        } catch (error) {
            console.warn('設定の取得に失敗（デフォルト値を使用）:', error);
            return {
                yellow_threshold: 2,
                red_threshold: 4,
                yellow_color: '#fff3cd',
                red_color: '#f8d7da',
                font_family: 'Noto Sans JP',
                hide_inactive_clients: false
            };
        }
    }

    // --- Client Management Functions (Supabase版) ---
    async function deleteClient(clientId) {
        const confirmed = confirm('このクライアントを削除しますか？（復元可能）');
        if (!confirmed) return;

        try {
            await SupabaseAPI.deleteClient(clientId);
            await refreshClients();
            alert('クライアントが削除されました');
        } catch (error) {
            console.error('Delete client error:', error);
            alert('削除に失敗しました: ' + handleSupabaseError(error));
        }
    }

    async function restoreClient(clientId) {
        const confirmed = confirm('このクライアントを復元しますか？');
        if (!confirmed) return;

        try {
            await SupabaseAPI.restoreClient(clientId);
            await refreshClients();
            alert('クライアントが復元されました');
        } catch (error) {
            console.error('Restore client error:', error);
            alert('復元に失敗しました: ' + handleSupabaseError(error));
        }
    }

    async function refreshClients() {
        try {
            clients = await fetchClients();
            renderClients();
        } catch (error) {
            console.error('Refresh clients error:', error);
            alert('クライアント一覧の更新に失敗しました: ' + handleSupabaseError(error));
        }
    }

    // --- Staff Management Functions (Supabase版) ---
    async function saveStaffs() {
        try {
            // 変更されたスタッフのみ更新
            const promises = currentEditingStaffs.map(async (staff, index) => {
                const originalStaff = originalStaffsState[index];
                if (originalStaff && staff.name !== originalStaff.name) {
                    return await SupabaseAPI.updateStaff(staff.id, { name: staff.name });
                }
                return null;
            });

            await Promise.all(promises.filter(p => p !== null));
            
            staffs = await fetchStaffs();
            populateFilters();
            renderClients();
            closeStaffModal();
            alert('スタッフ情報が保存されました');
        } catch (error) {
            console.error('Save staffs error:', error);
            alert('スタッフ情報の保存に失敗しました: ' + handleSupabaseError(error));
        }
    }

    // --- Settings Functions (Supabase版) ---
    async function saveBasicSettings() {
        const yellowThreshold = parseInt(yellowThresholdSelect.value);
        const redThreshold = parseInt(redThresholdSelect.value);
        const yellowColor = yellowColorInput.value;
        const redColor = redColorInput.value;
        const fontFamily = fontFamilySelect.value;
        const hideInactiveClients = hideInactiveClientsCheckbox.checked;

        if (yellowThreshold >= redThreshold) {
            alert("黄色の閾値は赤色の閾値より小さくしてください。");
            return;
        }

        try {
            // 設定をSupabaseに保存
            await Promise.all([
                SupabaseAPI.setSetting('yellow_threshold', yellowThreshold),
                SupabaseAPI.setSetting('red_threshold', redThreshold),
                SupabaseAPI.setSetting('yellow_color', yellowColor),
                SupabaseAPI.setSetting('red_color', redColor),
                SupabaseAPI.setSetting('font_family', fontFamily),
                SupabaseAPI.setSetting('hide_inactive_clients', hideInactiveClients)
            ]);

            appSettings = {
                yellow_threshold: yellowThreshold,
                red_threshold: redThreshold,
                yellow_color: yellowColor,
                red_color: redColor,
                font_family: fontFamily,
                hide_inactive_clients: hideInactiveClients
            };

            applyFontFamily(fontFamily);
            renderClients();
            closeBasicSettingsModal();
            alert('設定が保存されました');
        } catch (error) {
            console.error('Save settings error:', error);
            alert('設定の保存に失敗しました: ' + handleSupabaseError(error));
        }
    }

    // --- CSV Functions (Supabase版) ---
    async function exportCSV() {
        try {
            const csvData = generateCSVData(clients);
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8-bom' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export CSV error:', error);
            alert('CSVエクスポートに失敗しました');
        }
    }

    function generateCSVData(clientsData) {
        const headers = ['ID', '事業所名', '決算月', '担当者', '経理方式', 'ステータス'];
        const rows = [headers.join(',')];
        
        clientsData.forEach(client => {
            const row = [
                client.id,
                `"${client.name}"`,
                client.fiscal_month,
                `"${client.staff_name}"`,
                `"${client.accounting_method || ''}"`,
                `"${client.status || ''}"`
            ];
            rows.push(row.join(','));
        });
        
        return '\uFEFF' + rows.join('\n'); // UTF-8 BOM
    }

    // --- Event Listeners ---
    function addEventListeners() {
        // Authentication events
        signInButton?.addEventListener('click', signIn);
        signOutButton?.addEventListener('click', signOut);

        // 既存のイベントリスナーはそのまま...
        // （省略：元のindex.jsのイベントリスナー部分をそのまま使用）
        
        // Search and filter events
        searchInput.addEventListener('input', () => {
            saveFilterState();
            renderClients();
        });

        staffFilter.addEventListener('change', () => {
            saveFilterState();
            renderClients();
        });

        monthFilter.addEventListener('change', () => {
            saveFilterState();
            renderClients();
        });

        // CSV events
        exportCsvButton?.addEventListener('click', exportCSV);
        importCsvButton?.addEventListener('click', () => csvFileInput.click());
        csvFileInput?.addEventListener('change', importCSV);

        // Modal events
        openBasicSettingsModalButton?.addEventListener('click', openBasicSettingsModal);
        closeBasicSettingsModalButton?.addEventListener('click', closeBasicSettingsModal);
        saveBasicSettingsButton?.addEventListener('click', saveBasicSettings);
        cancelBasicSettingsButton?.addEventListener('click', closeBasicSettingsModal);

        // Table sorting events
        clientsTableHeadRow.addEventListener('click', handleSort);
    }

    // --- Utility Functions ---
    // （既存のutility関数群をそのまま含める）

    // アプリ起動時に認証チェック
    checkAuth();
});