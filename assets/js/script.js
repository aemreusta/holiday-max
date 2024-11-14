// script.js
// Define the holidays for 2025
const holidays = {
    "Yılbaşı": "2025-01-01",
    "Ramazan Bayramı": ["2025-03-30", "2025-03-31", "2025-04-01"],
    "Ulusal Egemenlik ve Çocuk Bayramı": "2025-04-23",
    "İşçi Bayramı": "2025-05-01",
    "Gençlik ve Spor Bayramı": "2025-05-19",
    "Kurban Bayramı": ["2025-06-06", "2025-06-07", "2025-06-08", "2025-06-09"],
    "Demokrasi ve Milli Birlik Günü": "2025-07-15",
    "Zafer Bayramı": "2025-08-30",
    "Cumhuriyet Bayramı": ["2025-10-29"]
};

const translations = {
    en: {
        title: "2025 Leave Planner",
        maxLeavesLabel: "Max allowed leave days:",
        calculateButton: "Calculate",
        errorMessage: "Something went wrong. Please try again.",
        proposedLeavesTitle: "Recommended Leave Days for 2025",
        longWeekendTitle: "Extended Weekends and Holiday Periods",
        totalConsecutiveDays: "Total continuous holiday days:",
        totalHolidays: "Total days off in 2025 (includes weekends, public holidays, and leave days):",
        dateRangeSeparator: "to", // Used for date ranges
        days: "days",
    },
    tr: {
        title: "2025 İzin Planlayıcı",
        maxLeavesLabel: "Maksimum izin günleri:",
        calculateButton: "Hesapla",
        errorMessage: "Bir hata oluştu. Lütfen tekrar deneyin.",
        proposedLeavesTitle: "2025 İçin Önerilen İzin Günleri",
        longWeekendTitle: "Uzun Hafta Sonu / Tatil Dönemleri",
        totalConsecutiveDays: "Toplam ardışık tatil günleri:",
        totalHolidays: "2025'te toplam tatil günleri (hafta sonları, resmi tatiller ve izin günleri dahil):",
        dateRangeSeparator: "ile", // Used for date ranges
        days: "gün",
    }
};

let lastCalculatedData = null; // Store results of last calculation

// Helper functions
function strToDate(dateStr) {
    return new Date(dateStr);
}

function getHolidayDates() {
    const allHolidayDates = new Set();
    Object.values(holidays).forEach(dates => {
        (Array.isArray(dates) ? dates : [dates]).forEach(date => {
            allHolidayDates.add(strToDate(date));
        });
    });
    return allHolidayDates;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function areDatesEqual(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function buildClusters(startDate, endDate, allHolidayDates) {
    const clusters = [];
    let currentCluster = new Set();
    let current = new Date(startDate);

    while (current <= endDate) {
        const isHoliday = Array.from(allHolidayDates).some(d => areDatesEqual(d, current));
        if (isHoliday || current.getDay() === 0 || current.getDay() === 6) {
            currentCluster.add(new Date(current));
        } else if (currentCluster.size > 0) {
            clusters.push(new Set(currentCluster));
            currentCluster = new Set();
        }
        current = addDays(current, 1);
    }

    if (currentCluster.size > 0) {
        clusters.push(new Set(currentCluster));
    }
    return clusters;
}

function scorePotentialLeave(current, workingDays, cluster1, cluster2) {
    let score = 15 - workingDays;
    const combinedCluster = new Set([...cluster1, ...cluster2]);
    
    const adjacentDays = Array.from(combinedCluster).filter(d => {
        const diffDays = Math.abs(d.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
    }).length;

    if (adjacentDays >= 7) score += 5;
    if (adjacentDays >= 10) score += 5;
    return score;
}

function findEfficientLeaves(maxLeaves = 14) {
    const allHolidayDates = getHolidayDates();
    const sortedDates = Array.from(allHolidayDates).sort((a, b) => a - b);
    const startDate = addDays(sortedDates[0], -10);
    const endDate = addDays(sortedDates[sortedDates.length - 1], 10);

    const clusters = buildClusters(startDate, endDate, allHolidayDates);
    const potentialLeaves = [];

    for (let i = 0; i < clusters.length - 1; i++) {
        const cluster1Array = Array.from(clusters[i]);
        const cluster2Array = Array.from(clusters[i + 1]);
        const gapStart = new Date(Math.max(...cluster1Array.map(d => d.getTime())));
        const gapEnd = new Date(Math.min(...cluster2Array.map(d => d.getTime())));
        const gapDays = Math.floor((gapEnd - gapStart) / (1000 * 60 * 60 * 24)) - 1;

        let workingDays = 0;
        for (let j = 1; j <= gapDays; j++) {
            const day = addDays(gapStart, j);
            if (day.getDay() > 0 && day.getDay() < 6) workingDays++;
        }

        if (workingDays <= 7) {
            for (let offset = 1; offset <= gapDays; offset++) {
                const day = addDays(gapStart, offset);
                const isWeekday = day.getDay() > 0 && day.getDay() < 6;
                const isNotHoliday = !Array.from(allHolidayDates).some(d => areDatesEqual(d, day));
                
                if (isWeekday && isNotHoliday) {
                    const score = scorePotentialLeave(day, workingDays, clusters[i], clusters[i + 1]);
                    potentialLeaves.push([day, score]);
                }
            }
        }
    }

    potentialLeaves.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    return potentialLeaves.slice(0, maxLeaves).map(item => item[0]).sort((a, b) => a - b);
}

function calculateConsecutiveDays(proposedLeaves, allHolidays) {
    const allDates = new Set([
        ...Array.from(proposedLeaves),
        ...Array.from(allHolidays)
    ].map(d => d.getTime()));

    const startDate = new Date(Math.min(...allDates));
    const endDate = new Date(Math.max(...allDates));
    startDate.setDate(startDate.getDate() - 7);
    endDate.setDate(endDate.getDate() + 7);

    let current = new Date(startDate);
    while (current <= endDate) {
        if (current.getDay() === 0 || current.getDay() === 6) {
            allDates.add(current.getTime());
        }
        current = addDays(current, 1);
    }

    const sortedDates = Array.from(allDates)
        .map(ts => new Date(ts))
        .sort((a, b) => a - b);

    const consecutivePeriods = [];
    let currentPeriod = [];

    for (const date of sortedDates) {
        if (currentPeriod.length === 0 || 
            (date.getTime() - currentPeriod[currentPeriod.length - 1].getTime()) === 24 * 60 * 60 * 1000) {
            currentPeriod.push(date);
        } else {
            if (currentPeriod.length >= 3) {
                consecutivePeriods.push([...currentPeriod]);
            }
            currentPeriod = [date];
        }
    }

    if (currentPeriod.length >= 3) {
        consecutivePeriods.push(currentPeriod);
    }

    return consecutivePeriods;
}

function formatDate(date, langCode) {
    return date.toLocaleDateString(langCode, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        weekday: 'long'
    });
}

function formatDateShort(date, langCode) {
    return date.toLocaleDateString(langCode, {
        day: '2-digit',
        month: 'long'
    });
}

// UI related functions
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('error').style.display = 'none';
    document.getElementById('calculateBtn').disabled = true;
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('calculateBtn').disabled = false;
}

function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message || 'Bir hata oluştu. Lütfen tekrar deneyin.';
    errorElement.style.display = 'block';
    hideLoading();
}

function createResultsHTML(proposedLeaves, consecutivePeriods, totalConsecutiveDays, totalHolidays, lang, langCode) {
    return `
        <div class="results-section">
            <h2>${lang.proposedLeavesTitle} (${proposedLeaves.length} ${lang.days}):</h2>
            <ul class="leave-days">
                ${proposedLeaves.map(date => 
                    `<li>${formatDate(date, langCode)}</li>`
                ).join('')}
            </ul>

            <h2>${lang.longWeekendTitle}:</h2>
            <ul class="holiday-periods">
                ${consecutivePeriods.map(period => {
                    const rangeText = langCode === 'tr-TR' 
                        ? `${formatDateShort(period[0], langCode)} ${lang.dateRangeSeparator} ${formatDateShort(period[period.length - 1], langCode)} arası` 
                        : `${formatDateShort(period[0], langCode)} ${lang.dateRangeSeparator} ${formatDateShort(period[period.length - 1], langCode)}`;
                    return `<li>${rangeText}: ${period.length} ${lang.days}</li>`;
                }).join('')}
            </ul>

            <div class="summary">
                <p>${lang.totalConsecutiveDays} ${totalConsecutiveDays}</p>
                <p>${lang.totalHolidays} ${totalHolidays}</p>
            </div>
        </div>
    `;
}

async function calculateLeaves(reuseLastData = false) {
    try {
        showLoading();

        const maxLeavesInput = document.getElementById('maxLeaves');
        const maxLeaves = parseInt(maxLeavesInput.value);
        const selectedLanguage = document.getElementById('languageSelect').value;
        const lang = translations[selectedLanguage];
        const langCode = selectedLanguage === 'tr' ? 'tr-TR' : 'en-US';

        if (isNaN(maxLeaves) || maxLeaves < 1 || maxLeaves > 30) {
            throw new Error(lang.errorMessage);
        }

        let proposedLeaves, allHolidays, allOffDays, consecutivePeriods, totalConsecutiveDays;

        if (reuseLastData && lastCalculatedData) {
            // Use previously calculated data
            ({ proposedLeaves, allHolidays, allOffDays, consecutivePeriods, totalConsecutiveDays } = lastCalculatedData);
        } else {
            // Perform new calculation
            proposedLeaves = findEfficientLeaves(maxLeaves) || [];
            allHolidays = getHolidayDates() || new Set();
            allOffDays = new Set([...proposedLeaves, ...Array.from(allHolidays)]);
            consecutivePeriods = calculateConsecutiveDays(proposedLeaves, allHolidays) || [];
            totalConsecutiveDays = consecutivePeriods.reduce((sum, period) => sum + period.length, 0);

            // Save current calculation to reuse
            lastCalculatedData = { proposedLeaves, allHolidays, allOffDays, consecutivePeriods, totalConsecutiveDays };
        }

        // Generate the results HTML
        const resultsHTML = createResultsHTML(
            proposedLeaves,
            consecutivePeriods,
            totalConsecutiveDays,
            allOffDays.size,
            lang,
            langCode
        );

        // Display results
        const resultsElement = document.getElementById('results');
        resultsElement.style.display = 'block';
        resultsElement.innerHTML = resultsHTML;
        
        hideLoading();

    } catch (error) {
        showError(error.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Set default language based on browser language
    const browserLang = navigator.language || navigator.languages[0];
    const defaultLang = browserLang.startsWith('tr') ? 'tr' : 'en';
    document.getElementById('languageSelect').value = defaultLang;
    switchLanguage();

    // Hide results initially
    document.getElementById('results').style.display = 'none';

    const maxLeavesInput = document.getElementById('maxLeaves');
    let debounceTimeout;

    // Function to trigger calculation with debouncing
    const triggerCalculation = () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            calculateLeaves();
        }, 300);
    };

    // Event listener for input and change events on maxLeaves input
    maxLeavesInput.addEventListener('input', triggerCalculation);
    maxLeavesInput.addEventListener('change', triggerCalculation);

    // Language switch event listener
    document.getElementById('languageSelect').addEventListener('change', switchLanguage);

    // Trigger calculation only when the button is clicked for the first time
    document.getElementById('calculateBtn').addEventListener('click', () => {
        calculateLeaves();
        document.getElementById('results').style.display = 'block'; // Show results after first calculation
    });
});

// Language switching function
function switchLanguage() {
    const selectedLanguage = document.getElementById('languageSelect').value;
    const lang = translations[selectedLanguage];

    document.querySelector('h1').textContent = lang.title;
    document.querySelector('label[for="maxLeaves"]').textContent = lang.maxLeavesLabel;
    document.getElementById('calculateBtn').textContent = lang.calculateButton;
    document.getElementById('error').textContent = lang.errorMessage;

    // Reload results in new language using last calculated data
    calculateLeaves(true);
}

// Path: assets/js/main.js
// main.js
function main() {
    const maxLeaves = 14;
    const proposedLeaves = findEfficientLeaves(maxLeaves);
    const allHolidays = getHolidayDates();

    // Calculate all off days
    const allOffDays = new Set();
    let current = new Date('2025-01-01');
    const endOfYear = new Date('2025-12-31');
    
    while (current <= endOfYear) {
        if (current.getDay() === 0 || current.getDay() === 6 || 
            Array.from(allHolidays).some(d => areDatesEqual(d, current))) {
            allOffDays.add(new Date(current));
        }
        current = addDays(current, 1);
    }
    proposedLeaves.forEach(date => allOffDays.add(date));

    console.log(`\n2025 için Önerilen İzin Günleri (${maxLeaves} günün ${proposedLeaves.length} günü kullanılıyor):`);
    proposedLeaves.forEach(date => {
        console.log(formatDate(date));
    });

    const consecutivePeriods = calculateConsecutiveDays(proposedLeaves, allHolidays);

    console.log('\nUzun Hafta Sonu/Tatil Dönemleri:');
    const totalConsecutiveDays = consecutivePeriods.reduce((sum, period) => sum + period.length, 0);
    
    consecutivePeriods.forEach(period => {
        console.log(`- ${formatDateShort(period[0])} ile ${formatDateShort(period[period.length - 1])} arası: ${period.length} gün`);
    });

    console.log(`\nToplam ardışık tatil günleri: ${totalConsecutiveDays}`);
    console.log(`2025'te toplam tatil günleri (tüm haftasonları + resmi tatiller + izinler): ${allOffDays.size}`);
}

main();