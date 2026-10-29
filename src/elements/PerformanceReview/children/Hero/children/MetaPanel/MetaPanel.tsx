"use client";

import { useState } from "react";
import { CurrencyCombobox } from "@/elements/CurrencyCombobox/CurrencyCombobox";
import position from "./MetaPanel.position.module.css";
import styles from "./MetaPanel.styles.module.css";

const DESCRIPTION_MAX = 200;

type MetaPanelProps = {
  offeredAmount: number | null;
  offeredCurrency: string | null;
  description: string;
  date: string;
  closedDate: string | null;
  onOfferedAmountChange: (value: number | null) => void;
  onOfferedCurrencyChange: (value: string | null) => void;
  onDescriptionChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onClosedDateChange: (value: string | null) => void;
};

export function MetaPanel({
  offeredAmount,
  offeredCurrency,
  description,
  date,
  closedDate,
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
        className={`${styles.toggle} ${position.toggle}`}
        data-construction
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse call details" : "Expand call details"}
      >
        •••
      </button>
      {expanded && (
        <div className={`${styles.panel} ${position.panel}`} data-construction>
          <div className={position.datesRow} data-construction>
            <label className={position.field} data-construction>
              <span className={styles.fieldLabel} data-construction>
                Meeting date
              </span>
              <input
                type="date"
                className={`${styles.dateInput} ${position.dateInput}`}
                data-construction
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
              />
            </label>
            <label className={position.field} data-construction>
              <span className={styles.fieldLabel} data-construction>
                Closed date
              </span>
              <input
                type="date"
                className={`${styles.dateInput} ${position.dateInput}`}
                data-construction
                value={closedDate ?? ""}
                onChange={(event) => onClosedDateChange(event.target.value === "" ? null : event.target.value)}
              />
            </label>
          </div>
          <label className={position.field} data-construction>
            <span className={styles.fieldLabel} data-construction>
              Offered amount
            </span>
            <div className={position.amountRow} data-construction>
              <input
                type="number"
                className={`${styles.amountInput} ${position.amountInput}`}
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
              className={`${styles.descriptionInput} ${position.descriptionInput}`}
              data-construction
              value={description}
              maxLength={DESCRIPTION_MAX}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="What was this call about?"
            />
            <span className={styles.charCount} data-construction>
              {description.length}/{DESCRIPTION_MAX}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
