const cards = [
  {
    label: 'Total Revenue',
    value: '$1,250.00',
    delta: '+12.5%',
    up: true,
    footer: 'Trending up this month',
    hint: 'Visitors for the last 6 months',
    spark: [
      { id: 'rev-0', height: 3 },
      { id: 'rev-1', height: 4 },
      { id: 'rev-2', height: 3 },
      { id: 'rev-3', height: 5 },
      { id: 'rev-4', height: 6 },
      { id: 'rev-5', height: 5 },
      { id: 'rev-6', height: 7 },
      { id: 'rev-7', height: 8 },
      { id: 'rev-8', height: 7 },
      { id: 'rev-9', height: 9 },
      { id: 'rev-10', height: 10 },
      { id: 'rev-11', height: 11 },
    ],
  },
  {
    label: 'New Customers',
    value: '1,234',
    delta: '-20%',
    up: false,
    footer: 'Down 20% this period',
    hint: 'Acquisition needs attention',
    spark: [
      { id: 'cust-0', height: 10 },
      { id: 'cust-1', height: 9 },
      { id: 'cust-2', height: 8 },
      { id: 'cust-3', height: 9 },
      { id: 'cust-4', height: 7 },
      { id: 'cust-5', height: 6 },
      { id: 'cust-6', height: 7 },
      { id: 'cust-7', height: 5 },
      { id: 'cust-8', height: 4 },
      { id: 'cust-9', height: 5 },
      { id: 'cust-10', height: 3 },
      { id: 'cust-11', height: 2 },
    ],
  },
  {
    label: 'Active Accounts',
    value: '45,678',
    delta: '+12.5%',
    up: true,
    footer: 'Strong user retention',
    hint: 'Engagement exceed targets',
    spark: [
      { id: 'acct-0', height: 4 },
      { id: 'acct-1', height: 5 },
      { id: 'acct-2', height: 5 },
      { id: 'acct-3', height: 6 },
      { id: 'acct-4', height: 7 },
      { id: 'acct-5', height: 6 },
      { id: 'acct-6', height: 8 },
      { id: 'acct-7', height: 8 },
      { id: 'acct-8', height: 9 },
      { id: 'acct-9', height: 10 },
      { id: 'acct-10', height: 9 },
      { id: 'acct-11', height: 11 },
    ],
  },
  {
    label: 'Growth Rate',
    value: '4.5%',
    delta: '+4.5%',
    up: true,
    footer: 'Steady performance increase',
    hint: 'Meets growth projections',
    spark: [
      { id: 'growth-0', height: 2 },
      { id: 'growth-1', height: 3 },
      { id: 'growth-2', height: 3 },
      { id: 'growth-3', height: 4 },
      { id: 'growth-4', height: 4 },
      { id: 'growth-5', height: 5 },
      { id: 'growth-6', height: 5 },
      { id: 'growth-7', height: 6 },
      { id: 'growth-8', height: 6 },
      { id: 'growth-9', height: 7 },
      { id: 'growth-10', height: 8 },
      { id: 'growth-11', height: 8 },
    ],
  },
] as const;

function PixelArrow({ up }: { up: boolean }) {
  return (
    <span className={`db-px-arrow${up ? ' is-up' : ' is-down'}`} aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}

export function SectionCards() {
  return (
    <section className="db-cards" aria-label="Key metrics">
      {cards.map((card) => (
        <article key={card.label} className="db-card">
          <div className="db-card__top">
            <p className="db-card__label">{card.label}</p>
            <span className={`db-badge ${card.up ? 'is-up' : 'is-down'}`}>
              <PixelArrow up={card.up} />
              {card.delta}
            </span>
          </div>
          <p className="db-card__value">{card.value}</p>
          <div className="db-card__spark" aria-hidden>
            {card.spark.map((col) => (
              <span
                key={col.id}
                className="db-card__spark-col"
                style={{ height: `${col.height * 3}px` }}
              />
            ))}
          </div>
          <div className="db-card__foot">
            <p className="db-card__footer">
              {card.footer} <PixelArrow up={card.up} />
            </p>
            <p className="db-card__hint">{card.hint}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
