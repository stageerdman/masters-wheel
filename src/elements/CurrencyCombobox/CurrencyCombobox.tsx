"use client";

import { useId, useState, type KeyboardEvent } from "react";
import position from "./CurrencyCombobox.position.module.css";
import styles from "./CurrencyCombobox.styles.module.css";

const CURRENCIES: { code: string; name: string }[] = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "INR", name: "Indian Rupee" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "ZAR", name: "South African Rand" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "KRW", name: "South Korean Won" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "THB", name: "Thai Baht" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "COP", name: "Colombian Peso" },
  { code: "PEN", name: "Peruvian Sol" },
];

type CurrencyComboboxProps = {
  value: string | null;
  onChange: (code: string | null) => void;
};

export function CurrencyCombobox({ value, onChange }: CurrencyComboboxProps) {
  const listboxId = useId();
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const matches = query.trim()
    ? CURRENCIES.filter(
        (currency) =>
          currency.code.toLowerCase().includes(query.toLowerCase()) ||
          currency.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  function select(code: string) {
    onChange(code);
    setQuery("");
    setHighlighted(0);
    setEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!matches.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => (index + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => (index - 1 + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      select(matches[highlighted].code);
    } else if (event.key === "Escape") {
      setEditing(false);
      setQuery("");
    }
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <input
        type="text"
        className={`${styles.input} ${position.input}`}
        data-construction
        value={editing ? query : value ?? ""}
        onFocus={() => {
          setEditing(true);
          setQuery("");
          setHighlighted(0);
        }}
        onBlur={() => {
          setEditing(false);
          setQuery("");
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlighted(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Currency"
        aria-label="Currency"
        role="combobox"
        aria-expanded={editing && matches.length > 0}
        aria-controls={listboxId}
      />
      {editing && matches.length > 0 && (
        <ul
          id={listboxId}
          className={`${styles.suggestions} ${position.suggestions}`}
          data-construction
          role="listbox"
        >
          {matches.map((currency, index) => (
            <li key={currency.code}>
              <button
                type="button"
                className={`${styles.suggestion} ${position.suggestion} ${
                  index === highlighted ? styles.highlighted : ""
                }`}
                data-construction
                role="option"
                aria-selected={index === highlighted}
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(currency.code);
                }}
              >
                {currency.code} — {currency.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
