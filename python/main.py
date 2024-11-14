import locale
from datetime import datetime, timedelta

# Define the holidays for 2025
holidays = {
    "Yılbaşı": "2025-01-01",
    "Ramazan Bayramı": ["2025-03-30", "2025-03-31", "2025-04-01"],
    "Ulusal Egemenlik ve Çocuk Bayramı": "2025-04-23",
    "İşçi Bayramı": "2025-05-01",
    "Gençlik ve Spor Bayramı": "2025-05-19",
    "Kurban Bayramı": ["2025-06-06", "2025-06-07", "2025-06-08", "2025-06-09"],
    "Demokrasi ve Milli Birlik Günü": "2025-07-15",
    "Zafer Bayramı": "2025-08-30",
    "Cumhuriyet Bayramı": ["2025-10-29"],
}


def str_to_date(date_str):
    return datetime.strptime(date_str, "%Y-%m-%d")


def get_holiday_dates():
    all_holiday_dates = {
        str_to_date(date)
        for dates in holidays.values()
        for date in (dates if isinstance(dates, list) else [dates])
    }
    return all_holiday_dates


def build_clusters(start_date, end_date, all_holiday_dates):
    clusters, current_cluster = [], set()
    current = start_date

    while current <= end_date:
        if current in all_holiday_dates or current.weekday() >= 5:
            current_cluster.add(current)
        elif current_cluster:
            clusters.append(current_cluster)
            current_cluster = set()
        current += timedelta(days=1)

    if current_cluster:
        clusters.append(current_cluster)
    return clusters


def score_potential_leave(current, working_days, cluster1, cluster2):
    score = 15 - working_days
    adjacent_days = sum(1 for d in cluster1 | cluster2 if abs((d - current).days) <= 7)

    score += 5 if adjacent_days >= 7 else 0
    score += 5 if adjacent_days >= 10 else 0
    return score


def find_efficient_leaves(max_leaves=14):
    all_holiday_dates = get_holiday_dates()
    sorted_dates = sorted(all_holiday_dates)
    start_date, end_date = (
        sorted_dates[0] - timedelta(days=10),
        sorted_dates[-1] + timedelta(days=10),
    )

    clusters = build_clusters(start_date, end_date, all_holiday_dates)
    potential_leaves = []

    for i in range(len(clusters) - 1):
        gap_start, gap_end = max(clusters[i]), min(clusters[i + 1])
        gap_days = (gap_end - gap_start).days - 1
        working_days = sum(
            1
            for d in range(1, gap_days + 1)
            if (gap_start + timedelta(days=d)).weekday() < 5
        )

        if working_days <= 7:
            for offset in range(1, gap_days + 1):
                day = gap_start + timedelta(days=offset)
                if day.weekday() < 5 and day not in all_holiday_dates:
                    score = score_potential_leave(
                        day, working_days, clusters[i], clusters[i + 1]
                    )
                    potential_leaves.append((day, score))

    potential_leaves.sort(key=lambda x: (-x[1], x[0]))
    return sorted([date for date, _ in potential_leaves[:max_leaves]])


def calculate_consecutive_days(proposed_leaves, all_holidays):
    all_dates = set(proposed_leaves) | all_holidays
    start_date, end_date = (
        min(all_dates) - timedelta(days=7),
        max(all_dates) + timedelta(days=7),
    )

    all_dates |= {
        current
        for current in (
            start_date + timedelta(days=i)
            for i in range((end_date - start_date).days + 1)
        )
        if current.weekday() >= 5
    }
    all_dates = sorted(all_dates)

    consecutive_periods, current_period = [], []

    for date in all_dates:
        if not current_period or (date - current_period[-1]).days == 1:
            current_period.append(date)
        else:
            if len(current_period) >= 3:
                consecutive_periods.append(current_period)
            current_period = [date]

    if current_period and len(current_period) >= 3:
        consecutive_periods.append(current_period)

    return consecutive_periods


def main():
    # Set locale to Turkish
    try:
        locale.setlocale(locale.LC_TIME, "tr_TR.UTF-8")
    except locale.Error:
        print("The Turkish locale is not installed on your system.")

    try:
        max_leaves = int(
            input("Maksimum izin günü sayısını girin (varsayılan 14): ").strip() or "14"
        )
    except ValueError:
        print("Geçersiz giriş. Varsayılan değer olan 14 gün kullanılacak.")
        max_leaves = 14

    proposed_leaves = find_efficient_leaves(max_leaves)
    all_holidays = get_holiday_dates()
    all_off_days = {
        d
        for d in (datetime(2025, 1, 1) + timedelta(days=i) for i in range(365))
        if d.weekday() >= 5 or d in all_holidays
    }
    all_off_days.update(proposed_leaves)

    print(
        f"\n2025 için Önerilen İzin Günleri ({max_leaves} günün {len(proposed_leaves)} günü kullanılıyor):"
    )
    for date in proposed_leaves:
        print(date.strftime("%d %B %Y, %A"))

    consecutive_periods = calculate_consecutive_days(proposed_leaves, all_holidays)

    print("\nUzun Hafta Sonu/Tatil Dönemleri:")
    total_consecutive_days = sum(len(period) for period in consecutive_periods)
    for period in consecutive_periods:
        print(
            f"- {period[0].strftime('%d %B')} ile {period[-1].strftime('%d %B')} arası: {len(period)} gün"
        )

    print(f"\nToplam ardışık tatil günleri: {total_consecutive_days}")
    print(
        f"2025'te toplam tatil günleri (tüm haftasonları + resmi tatiller + izinler): {len(all_off_days)}"
    )


if __name__ == "__main__":
    main()
