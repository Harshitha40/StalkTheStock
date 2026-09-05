"use client";

import { useMemo, useState } from "react";

type CalculatorStock = {
  ticker: string;
  price: number | null;
};

interface StockCalculatorProps {
  stocks: CalculatorStock[];
  onClose: () => void;
}

function formatMoney(
  value: number
) {
  if (!Number.isFinite(value)) {
    return "$0.00";
  }

  return `$${value.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

export default function StockCalculator({
  stocks,
  onClose,
}: StockCalculatorProps) {
  const firstTicker =
    stocks[0]?.ticker ?? "";

  const [
    selectedTicker,
    setSelectedTicker,
  ] = useState(
    firstTicker
  );

  const [
    quantity,
    setQuantity,
  ] = useState("10");

  const [
    buyPrice,
    setBuyPrice,
  ] = useState("");

  const selectedStock =
    stocks.find(
      (stock) =>
        stock.ticker ===
        selectedTicker
    );

  const currentPrice =
    selectedStock?.price ?? null;

  const quantityNumber =
    Number(quantity);

  const buyPriceNumber =
    Number(buyPrice);

  const validQuantity =
    Number.isFinite(
      quantityNumber
    ) &&
    quantityNumber >= 0
      ? quantityNumber
      : 0;

  const validBuyPrice =
    Number.isFinite(
      buyPriceNumber
    ) &&
    buyPriceNumber >= 0
      ? buyPriceNumber
      : 0;

  const investment =
    validQuantity *
    validBuyPrice;

  const currentValue =
    currentPrice !== null
      ? validQuantity *
        currentPrice
      : 0;

  const pnl =
    currentValue -
    investment;

  const returnPercent =
    investment > 0
      ? (pnl / investment) *
        100
      : 0;

  /*
   * --------------------------------------------------
   * NORMAL CALCULATOR
   * --------------------------------------------------
   */

  const [
    expression,
    setExpression,
  ] = useState("");

  const [
    display,
    setDisplay,
  ] = useState("0");

  function appendNumber(
    value: string
  ) {
    if (
      display === "Error"
    ) {
      setDisplay(value);
      setExpression(value);
      return;
    }

    if (
      value === "." &&
      display.includes(".")
    ) {
      return;
    }

    const nextDisplay =
      display === "0" &&
      value !== "."
        ? value
        : display + value;

    setDisplay(
      nextDisplay
    );

    setExpression(
      expression + value
    );
  }

  function appendOperator(
    operator: string
  ) {
    if (
      display === "Error"
    ) {
      return;
    }

    if (!expression) {
      setExpression(
        display + operator
      );

      return;
    }

    const lastCharacter =
      expression[
        expression.length - 1
      ];

    if (
      ["+", "-", "*", "/"].includes(
        lastCharacter
      )
    ) {
      setExpression(
        expression.slice(
          0,
          -1
        ) + operator
      );

      return;
    }

    setExpression(
      expression + operator
    );

    setDisplay(
      "0"
    );
  }

  function clearCalculator() {
    setExpression("");
    setDisplay("0");
  }

  function deleteLast() {
    if (
      expression.length ===
      0
    ) {
      return;
    }

    const nextExpression =
      expression.slice(
        0,
        -1
      );

    setExpression(
      nextExpression
    );

    const lastPart =
      nextExpression.split(
        /[+\-*/]/
      );

    const current =
      lastPart[
        lastPart.length - 1
      ];

    setDisplay(
      current || "0"
    );
  }

  function calculateExpression() {
    if (!expression) {
      return;
    }

    /*
     * Allow only numbers,
     * decimal points and
     * arithmetic operators.
     */
    if (
      !/^[0-9+\-*/().\s]+$/.test(
        expression
      )
    ) {
      setDisplay("Error");
      setExpression("");
      return;
    }

    try {
      /*
       * Function constructor is
       * safe here because the
       * expression is strictly
       * validated above.
       */
      const result =
        Function(
          `"use strict"; return (${expression})`
        )();

      if (
        typeof result !==
          "number" ||
        !Number.isFinite(
          result
        )
      ) {
        throw new Error(
          "Invalid calculation"
        );
      }

      const formatted =
        Number.isInteger(
          result
        )
          ? String(result)
          : String(
              Number(
                result.toFixed(
                  10
                )
              )
            );

      setDisplay(
        formatted
      );

      setExpression(
        formatted
      );
    } catch {
      setDisplay("Error");
      setExpression("");
    }
  }

  const stockSummary =
    useMemo(
      () => ({
        investment,
        currentValue,
        pnl,
        returnPercent,
      }),
      [
        investment,
        currentValue,
        pnl,
        returnPercent,
      ]
    );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-end bg-slate-950/30 p-4 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
              Quick tools
            </p>

            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              Calculator
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
            aria-label="Close calculator"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5">

          {/* STOCK CALCULATOR */}

          <section>
            <div className="mb-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Stock calculator
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Calculate investment value,
                P&L and return.
              </p>
            </div>

            <select
              value={
                selectedTicker
              }
              onChange={(event) =>
                setSelectedTicker(
                  event.target.value
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500"
            >
              {stocks.length ===
              0 ? (
                <option value="">
                  No stocks available
                </option>
              ) : (
                stocks.map(
                  (stock) => (
                    <option
                      key={
                        stock.ticker
                      }
                      value={
                        stock.ticker
                      }
                    >
                      {
                        stock.ticker
                      }
                      {" · "}
                      {stock.price !==
                      null
                        ? formatMoney(
                            stock.price
                          )
                        : "N/A"}
                    </option>
                  )
                )
              )}
            </select>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Input
                label="Quantity"
                value={
                  quantity
                }
                onChange={
                  setQuantity
                }
              />

              <Input
                label="Buy price"
                value={
                  buyPrice
                }
                onChange={
                  setBuyPrice
                }
                placeholder="150.00"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Result
                label="Current price"
                value={
                  currentPrice !==
                  null
                    ? formatMoney(
                        currentPrice
                      )
                    : "N/A"
                }
              />

              <Result
                label="Investment"
                value={formatMoney(
                  stockSummary.investment
                )}
              />

              <Result
                label="Current value"
                value={formatMoney(
                  stockSummary.currentValue
                )}
              />

              <Result
                label="P&L"
                value={formatMoney(
                  stockSummary.pnl
                )}
                positive={
                  stockSummary.pnl >=
                  0
                }
              />

              <Result
                label="Return"
                value={`${stockSummary.returnPercent >= 0 ? "+" : ""}${stockSummary.returnPercent.toFixed(
                  2
                )}%`}
                positive={
                  stockSummary.returnPercent >=
                  0
                }
              />
            </div>
          </section>

          <div className="my-6 h-px bg-slate-100" />

          {/* NORMAL CALCULATOR */}

          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Calculator
            </p>

            <div className="rounded-2xl bg-slate-950 p-4">

              <div className="mb-3 rounded-xl bg-slate-900 px-4 py-4 text-right">
                <p className="mb-1 min-h-4 overflow-hidden text-xs text-slate-500">
                  {expression}
                </p>

                <p className="overflow-hidden text-2xl font-semibold text-white">
                  {display}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2">

                <Button
                  label="C"
                  onClick={
                    clearCalculator
                  }
                />

                <Button
                  label="⌫"
                  onClick={
                    deleteLast
                  }
                />

                <Button
                  label="%"
                  onClick={() => {
                    const value =
                      Number(
                        display
                      );

                    if (
                      Number.isFinite(
                        value
                      )
                    ) {
                      const result =
                        value /
                        100;

                      setDisplay(
                        String(
                          result
                        )
                      );

                      setExpression(
                        String(
                          result
                        )
                      );
                    }
                  }}
                />

                <Button
                  label="÷"
                  onClick={() =>
                    appendOperator(
                      "/"
                    )
                  }
                />

                {[
                  "7",
                  "8",
                  "9",
                ].map(
                  (value) => (
                    <Button
                      key={
                        value
                      }
                      label={
                        value
                      }
                      onClick={() =>
                        appendNumber(
                          value
                        )
                      }
                    />
                  )
                )}

                <Button
                  label="×"
                  onClick={() =>
                    appendOperator(
                      "*"
                    )
                  }
                />

                {[
                  "4",
                  "5",
                  "6",
                ].map(
                  (value) => (
                    <Button
                      key={
                        value
                      }
                      label={
                        value
                      }
                      onClick={() =>
                        appendNumber(
                          value
                        )
                      }
                    />
                  )
                )}

                <Button
                  label="−"
                  onClick={() =>
                    appendOperator(
                      "-"
                    )
                  }
                />

                {[
                  "1",
                  "2",
                  "3",
                ].map(
                  (value) => (
                    <Button
                      key={
                        value
                      }
                      label={
                        value
                      }
                      onClick={() =>
                        appendNumber(
                          value
                        )
                      }
                    />
                  )
                )}

                <Button
                  label="+"
                  onClick={() =>
                    appendOperator(
                      "+"
                    )
                  }
                />

                <Button
                  label="0"
                  onClick={() =>
                    appendNumber(
                      "0"
                    )
                  }
                />

                <Button
                  label="."
                  onClick={() =>
                    appendNumber(
                      "."
                    )
                  }
                />

                <div className="col-span-2">
                  <Button
                    label="="
                    onClick={
                      calculateExpression
                    }
                    primary
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   INPUT
   ========================================================= */

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <input
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-blue-500"
      />
    </label>
  );
}

/* =========================================================
   RESULT
   ========================================================= */

function Result({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-bold ${
          positive ===
          undefined
            ? "text-slate-950"
            : positive
            ? "text-emerald-600"
            : "text-red-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   CALCULATOR BUTTON
   ========================================================= */

function Button({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 rounded-xl text-sm font-semibold transition ${
        primary
          ? "bg-blue-600 text-white hover:bg-blue-500"
          : "bg-slate-800 text-white hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );
}