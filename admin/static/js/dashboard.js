// Admin Dashboard JavaScript

// Global variables
let allNews = [];
let currentPage = 1;
const itemsPerPage = 10;

// DOM elements (will be initialized when DOM is ready)
let sidebar, mainContent, sidebarToggle, newsTableBody, pagination;
let totalNewsEl, totalSourcesEl, lastUpdatedEl;

// Initialize DOM elements
function initializeDOM() {
    sidebar = document.getElementById('sidebar');
    mainContent = document.getElementById('main-content');
    sidebarToggle = document.getElementById('sidebar-toggle');
    newsTableBody = document.getElementById('news-table-body');
    pagination = document.getElementById('pagination');
    totalNewsEl = document.getElementById('total-news');
    totalSourcesEl = document.getElementById('total-sources');
    lastUpdatedEl = document.getElementById('last-updated');
}

// Sidebar toggle functionality
function setupSidebar() {
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        }
    });
}

// Fetch news data from API
async function fetchNewsData() {
    try {
        const response = await fetch('/api/news');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        allNews = result.data;

        // Update statistics
        updateStatistics(result);

        // Display news
        displayNews();

    } catch (error) {
        console.error('Error fetching news data:', error);
        showError('Failed to load news data. Please try again later.');
    }
}

// Update statistics cards
function updateStatistics(result) {
    if (totalNewsEl) totalNewsEl.textContent = result.total;

    // Count unique sources
    const sources = new Set(allNews.map(news => news.sumber));
    if (totalSourcesEl) totalSourcesEl.textContent = sources.size;

    // Set last updated time
    if (lastUpdatedEl) lastUpdatedEl.textContent = new Date().toLocaleString('id-ID');
}

// Display news in table with pagination
function displayNews() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedNews = allNews.slice(startIndex, endIndex);

    // Clear table body
    if (newsTableBody) {
        newsTableBody.innerHTML = '';
    }

    if (paginatedNews.length === 0) {
        if (newsTableBody) {
            newsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi bi-newspaper display-4"></i>
                        <p class="mt-2">No news articles found</p>
                    </td>
                </tr>
            `;
        }
        return;
    }

    // Add news rows
    paginatedNews.forEach((news, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${startIndex + index + 1}</td>
            <td>
                <div class="news-title" title="${news.title}">${news.title}</div>
            </td>
            <td>
                <div class="news-description" title="${news.description || 'No description'}">
                    ${news.description || 'No description'}
                </div>
            </td>
            <td>
                <span class="news-source">${news.sumber}</span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-2" onclick="viewNews(${startIndex + index})">
                    <i class="bi bi-eye"></i> View
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="editNews(${startIndex + index})">
                    <i class="bi bi-pencil"></i> Edit
                </button>
            </td>
        `;
        if (newsTableBody) {
            newsTableBody.appendChild(row);
        }
    });

    // Generate pagination
    generatePagination();
}

// Generate pagination links
function generatePagination() {
    if (!pagination) return;

    const totalPages = Math.ceil(allNews.length / itemsPerPage);
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">
            <i class="bi bi-chevron-left"></i>
        </a>
    `;
    pagination.appendChild(prevLi);

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `
            <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
        `;
        pagination.appendChild(pageLi);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">
            <i class="bi bi-chevron-right"></i>
        </a>
    `;
    pagination.appendChild(nextLi);
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(allNews.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        displayNews();
    }
}

// View news details in modal
function viewNews(index) {
    const news = allNews[index];
    showNewsModal(news);
}

// Edit news (placeholder)
function editNews(index) {
    const news = allNews[index];
    alert(`Edit functionality for: ${news.title}\n(This is a placeholder - implement edit logic)`);
}

// Show news details in modal
function showNewsModal(news) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('newsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'newsModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-newspaper me-2"></i>
                            News Details
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="news-detail-title" id="modal-title"></div>
                        <div class="news-detail-meta">
                            <p><strong>Source:</strong> <span id="modal-source"></span></p>
                            <p><strong>Date:</strong> <span id="modal-date"></span></p>
                        </div>
                        <div class="news-detail-description" id="modal-description"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="prevBtn" onclick="showPreviousNews()">
                            <i class="bi bi-chevron-left"></i> Previous
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" id="nextBtn" onclick="showNextNews()">
                            Next <i class="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Find current news index
    window.currentNewsIndex = allNews.findIndex(n => n.title === news.title && n.sumber === news.sumber);

    // Update navigation button states
    updateNavigationButtons();

    // Populate modal with news data
    document.getElementById('modal-title').textContent = news.title;
    document.getElementById('modal-source').textContent = news.sumber;
    document.getElementById('modal-date').textContent = new Date().toLocaleDateString('id-ID');
    document.getElementById('modal-description').innerHTML = `
        <p><strong>Description:</strong></p>
        <p>${news.description || 'No description available'}</p>
    `;

    // Show modal
    const bootstrap = window.bootstrap;
    if (bootstrap && bootstrap.Modal) {
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
    }
}

// Show error message
function showError(message) {
    if (newsTableBody) {
        newsTableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="error-message">
                        <i class="bi bi-exclamation-triangle"></i>
                        ${message}
                    </div>
                </td>
            </tr>
        `;
    }
}

// Initialize dashboard when DOM is ready
function initializeDashboard() {
    initializeDOM();
    setupSidebar();
    fetchNewsData();
}

// Refresh data every 30 seconds
function startAutoRefresh() {
    setInterval(fetchNewsData, 30000);
}

// Show previous news item
function showPreviousNews() {
    if (window.currentNewsIndex > 0) {
        window.currentNewsIndex--;
        const prevNews = allNews[window.currentNewsIndex];
        updateModalContent(prevNews);
        updateNavigationButtons();
    }
}

// Show next news item
function showNextNews() {
    if (window.currentNewsIndex < allNews.length - 1) {
        window.currentNewsIndex++;
        const nextNews = allNews[window.currentNewsIndex];
        updateModalContent(nextNews);
        updateNavigationButtons();
    }
}

// Update modal content with new news item
function updateModalContent(news) {
    document.getElementById('modal-title').textContent = news.title;
    document.getElementById('modal-source').textContent = news.sumber;
    document.getElementById('modal-description').innerHTML = `
        <p><strong>Description:</strong></p>
        <p>${news.description || 'No description available'}</p>
    `;
}

// Update navigation button states (enable/disable)
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.disabled = window.currentNewsIndex <= 0;
        prevBtn.style.opacity = window.currentNewsIndex <= 0 ? '0.5' : '1';
    }

    if (nextBtn) {
        nextBtn.disabled = window.currentNewsIndex >= allNews.length - 1;
        nextBtn.style.opacity = window.currentNewsIndex >= allNews.length - 1 ? '0.5' : '1';
    }
}
