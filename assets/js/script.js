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

function formatDate(date) {
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        weekday: 'long'
    });
}

function formatDateShort(date) {
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'long'
    });
}

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

function formatDateForDisplay(date) {
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        weekday: 'long'
    });
}

function formatDateShort(date) {
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'long'
    });
}

function createResultsHTML(proposedLeaves, consecutivePeriods, totalConsecutiveDays, totalHolidays) {
    return `
        <div class="results-section">
            <h2>2025 için Önerilen İzin Günleri (${proposedLeaves.length} gün):</h2>
            <ul class="leave-days">
                ${proposedLeaves.map(date => 
                    `<li>${formatDateForDisplay(date)}</li>`
                ).join('')}
            </ul>

            <h2>Uzun Hafta Sonu/Tatil Dönemleri:</h2>
            <ul class="holiday-periods">
                ${consecutivePeriods.map(period => 
                    `<li>${formatDateShort(period[0])} ile ${formatDateShort(period[period.length - 1])} arası: ${period.length} gün</li>`
                ).join('')}
            </ul>

            <div class="summary">
                <p>Toplam ardışık tatil günleri: ${totalConsecutiveDays}</p>
                <p>2025'te toplam tatil günleri (tüm haftasonları + resmi tatiller + izinler): ${totalHolidays}</p>
            </div>
        </div>
    `;
}

async function calculateLeaves() {
    try {
        showLoading();

        const maxLeavesInput = document.getElementById('maxLeaves');
        const maxLeaves = parseInt(maxLeavesInput.value);

        if (isNaN(maxLeaves) || maxLeaves < 1 || maxLeaves > 30) {
            throw new Error('Lütfen 1-30 arasında bir sayı girin.');
        }

        // Add artificial delay to show loading state (remove in production)
        await new Promise(resolve => setTimeout(resolve, 500));

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

        const consecutivePeriods = calculateConsecutiveDays(proposedLeaves, allHolidays);
        const totalConsecutiveDays = consecutivePeriods.reduce((sum, period) => sum + period.length, 0);

        const resultsHTML = createResultsHTML(
            proposedLeaves,
            consecutivePeriods,
            totalConsecutiveDays,
            allOffDays.size
        );

        document.getElementById('results').innerHTML = resultsHTML;
        hideLoading();

    } catch (error) {
        console.error('Calculation error:', error);
        showError(error.message);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const maxLeavesInput = document.getElementById('maxLeaves');
    let debounceTimeout;

    const triggerCalculation = () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            calculateLeaves();
        }, 300); // Adjust the delay as needed (300ms works well for debouncing)
    };

    // Trigger calculation on input and change events
    maxLeavesInput.addEventListener('input', triggerCalculation);
    maxLeavesInput.addEventListener('change', triggerCalculation);

    // Calculate initial results on page load
    calculateLeaves();
});
