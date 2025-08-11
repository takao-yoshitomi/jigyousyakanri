function initializeCustomDropdown(selectElement) {
    console.log('Initializing dropdown for selectElement:', selectElement.id || selectElement.name, 'with', selectElement.options.length, 'options.'); // Add this line

    const wrapper = selectElement.closest('.custom-select-wrapper'); // Find the closest wrapper
    if (!wrapper) {
        console.error("No .custom-select-wrapper found for select element:", selectElement);
        return;
    }

    const trigger = wrapper.querySelector('.custom-select-trigger');
    const optionsList = wrapper.querySelector('.custom-options');

    if (!selectElement || !trigger || !optionsList) {
        console.error("Missing elements in custom-select-wrapper:", wrapper);
        return;
    }

    // Set initial display text
    // Check if selectElement has options before accessing them
    if (selectElement.options.length > 0) {
        trigger.textContent = selectElement.options[selectElement.selectedIndex].textContent;
    } else {
        trigger.textContent = "選択してください"; // Default text if no options
    }


    // Clear existing custom options to prevent duplicates on re-initialization
    optionsList.innerHTML = '';

    // Populate custom options
    Array.from(selectElement.options).forEach(function(option) {
        const customOption = document.createElement('div');
        customOption.classList.add('custom-option');
        if (option.selected) {
            customOption.classList.add('selected');
        }
        customOption.dataset.value = option.value;
        customOption.textContent = option.textContent;
        optionsList.appendChild(customOption);

        customOption.addEventListener('click', function() {
            selectElement.value = this.dataset.value;
            trigger.textContent = this.textContent;
            optionsList.classList.remove('active');
            // Update selected class
            Array.from(optionsList.children).forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectElement.dispatchEvent(new Event('change')); // Trigger change event for original select
        });
    });

    trigger.addEventListener('click', function() {
        console.log('Trigger clicked!');
        console.log('optionsList element:', optionsList); // Add this line
        console.log('optionsList classes BEFORE toggle:', optionsList.classList.value); // Add this line
        optionsList.classList.toggle('active');
        console.log('optionsList classes AFTER toggle:', optionsList.classList.value); // Add this line
        // Also toggle 'active' class on the trigger itself for styling
        trigger.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!wrapper.contains(e.target)) {
            optionsList.classList.remove('active');
            trigger.classList.remove('active'); // Remove active class from trigger when closing
        }
    });
}

// Initial setup for any dropdowns already in the DOM on load (e.g., in edit.html)
document.addEventListener('DOMContentLoaded', function() {
    const selectsToInitialize = document.querySelectorAll('.custom-select-wrapper select');
    console.log('DOMContentLoaded: Found', selectsToInitialize.length, 'selects to initialize.');
    selectsToInitialize.forEach(function(select) {
        // Only initialize if the select element is not 'year-filter' from details.html
        // or if it already has options (for static dropdowns)
        if (select.id === 'year-filter' && select.options.length === 0) {
            // Skip year-filter if it has no options yet, as details.js will populate it
            console.log('Skipping year-filter initialization on DOMContentLoaded as it has no options yet.');
            return;
        }
        initializeCustomDropdown(select);
    });
});
