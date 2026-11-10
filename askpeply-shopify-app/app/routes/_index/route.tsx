import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, Form, useActionData, useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // Opened from inside Shopify admin (or with a shop) → go straight to the dashboard.
  if (url.searchParams.get("shop") || url.searchParams.get("host") || url.searchParams.get("embedded")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

const FEATURES = [
  { title: "Product knowledge", text: "Answers from your own catalog, COAs and policies. Nothing invented." },
  { title: "Compliance guardrails", text: "Dosing, medical and human-use questions are blocked before they reach the AI." },
  { title: "Conversation logs", text: "See every question, what was blocked and what needs your team." },
];

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;

  return (
    <div className={styles.index}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.content}>
        <span className={styles.pill}>
          <span className={styles.dot} /> The AI assistant built for peptide stores
        </span>
        <h1 className={styles.heading}>
          Answer every question.
          <br />
          <span>Stay compliant.</span>
        </h1>
        <p className={styles.text}>Always accurate. Always compliant. Always on.</p>

        {showForm && (
          <Form className={styles.form} method="post">
            <label className={styles.label}>
              <span>Your Shopify store</span>
              <input className={styles.input} type="text" name="shop" placeholder="my-store.myshopify.com" />
              <small className={errors?.shop ? styles.error : undefined}>
                {errors?.shop ?? "Enter your .myshopify.com domain to open AskPeply"}
              </small>
            </label>
            <button className={styles.button} type="submit">
              Open AskPeply →
            </button>
          </Form>
        )}

        <ul className={styles.list}>
          {FEATURES.map((f) => (
            <li key={f.title}>
              <strong>{f.title}</strong>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
