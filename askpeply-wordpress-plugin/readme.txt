=== AskPeply ===
Contributors: askpeply
Tags: ai, chatbot, gemini, ecommerce, woocommerce, customer-service
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Intelligent AI-powered shopping assistant and compliance chatbot for WordPress & WooCommerce, powered by Google Gemini.

== Description ==

AskPeply is an intelligent AI shopping assistant designed specifically for research and e-commerce stores. Built with compliance-first guardrails, AskPeply answers customer questions directly from your own products, pages, and store policies while strictly blocking medical, dosing, or unauthorized claims.

Features:
* Automatic store sync: Indexes WooCommerce products, WordPress pages, and store policies.
* Grounded AI responses: Answers only from your synchronized knowledge base using Google Gemini Flash.
* Built-in compliance guardrails: Automatically intercepts and refuses dosing, administration, human use, and medical questions before reaching the AI.
* Custom topics blocking: Block custom keywords and competitor names.
* WooCommerce Order Tracking: Secure order lookups directly in the chat with email verification.
* Gorgeous Floating AskBar: Nebula glow, typewriter question rotation, microphone voice input, and customizable themes.
* Flexible Plans & Access Control: Starter, Growth, and Pro tiers with usage tracking.
* Comprehensive Conversation Logs: Review customer chats, flags (answered, blocked, escalated), and team handling.

== Installation ==

1. Upload the `askpeply-wordpress-plugin` folder to the `/wp-content/plugins/` directory, or upload the zip file through Plugins -> Add New -> Upload Plugin.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Add your Gemini API key in the `.env` file or via the AskPeply admin dashboard under the AI & API tab.
4. Go to AskPeply -> Knowledge and click "Sync store" to import your products and pages.
5. Customize appearance, guardrails, and test your assistant!

== Frequently Asked Questions ==

= Does AskPeply require WooCommerce? =
AskPeply works with standard WordPress pages and policies out of the box. If WooCommerce is active, it automatically indexes products and provides order status lookups.

= Where do I get a Gemini API key? =
You can get a free Google Gemini API key at https://aistudio.google.com/

