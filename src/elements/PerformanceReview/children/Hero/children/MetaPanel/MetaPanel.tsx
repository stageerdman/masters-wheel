"use client";

import { useState } from "react";
import { CurrencyCombobox } from "@/elements/CurrencyCombobox/CurrencyCombobox";
import { humanDate } from "@/elements/PerformanceReview/PerformanceReview.data";
import position from "./MetaPanel.position.module.css";
import styles from "./MetaPanel.styles.module.css";

const DESCRIPTION_MAX = 200;
// The counter only appears when the limit is close enough to matter.
const DESCRIPTION_COUNTER_FROM = 180;

type MetaPanelProps = {
  offeredAmount: number | null;
  offeredCurrency: string | null;
  description: string;
  date: string;
  closedDate: string | null;
  isWon: boolean;
  outcomeLabel: string | null;
  onOfferedAmountChange: (value: number | null) => void;
  onOfferedCurrencyChange: (value: string | null) => void;
  onDescriptionChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onClosedDateChange: (value: string | null) => void;
};

/** One quiet line of facts: "12 Nov · Closed · 4,000 EUR". Missing parts are left out. */
function factsLine(
  date: string,
  outcomeLabel: string | null,
  offeredAmount: number | null,
  offeredCurrency: string | null,
): string {
  const parts: string[] = [];
  if (date) parts.push(humanDate(date));
  if (outcomeLabel) parts.push(outcomeLabel);
  if (offeredAmount !== null) {
    const amount = offeredAmount.toLocaleString();
    parts.push(offeredCurrency ? `${amount} ${offeredCurrency}` : amount);
  }
  return parts.length > 0 ? parts.join(" · ") : "Add call details";
}

export function MetaPanel({
  offeredAmount,
  offeredCurrency,
  description,
  date,
  closedDate,
  isWon,
  outcomeLabel,
  onOfferedAmountChange,
  onOfferedCurrencyChange,
  onDescriptionChange,
  onDateChange,
  onClosedDateChange,
}: MetaPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <button
        type="button"
        className={`${styles.facts} ${position.facts}`}
        data-construction
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-label="Edit call details"
      >
        {factsLine(date, outcomeLabel, offeredAmount, offeredCurrency)}
      </button>
      {expanded && (
        <div className={position.panel} data-construction>
          <div className={position.datesRow} data-construction>
            <label className={position.field} data-construction>
              <span className={styles.fieldLabel} data-construction>
                Meeting date
              </span>
              <input
                type="date"
                className={`${styles.input} ${position.dateInput}`}
                data-construction
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
              />
            </label>
            {isWon && (
              <label className={position.field} data-construction>
                <span className={styles.fieldLabel} data-construction>
                  Closed date
                </span>
                <input
                  type="date"
                  className={`${styles.input} ${position.dateInput}`}
                  data-construction
                  value={closedDate ?? ""}
                  onChange={(event) => onClosedDateChange(event.target.value === "" ? null : event.target.value)}
                />
              </label>
            )}
          </div>
          <label className={position.field} data-construction>
            <span className={styles.fieldLabel} data-construction>
              Offered amount
            </span>
            <div className={position.amountRow} data-construction>
              <input
                type="number"
                className={`${styles.input} ${position.amountInput}`}
                data-construction
                value={offeredAmount ?? ""}
                onChange={(event) =>
                  onOfferedAmountChange(event.target.value === "" ? null : Number(event.target.value))
                }
                placeholder="0"
              />
              <CurrencyCombobox value={offeredCurrency} onChange={onOfferedCurrencyChange} />
            </div>
          </label>
          <label className={position.field} data-construction>
            <span className={styles.fieldLabel} data-construction>
              Description
            </span>
            <textarea
              className={`${styles.input} ${styles.descriptionInput} ${position.descriptionInput}`}
              data-construction
              value={description}
              maxLength={DESCRIPTION_MAX}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="What was this call about?"
            />
            {description.length >= DESCRIPTION_COUNTER_FROM && (
              <span className={`${styles.charCount} ${position.charCount}`} data-construction>
                {description.length}/{DESCRIPTION_MAX}
              </span>
            )}
          </label>
        </div>
      )}
    </div>
  );
}
