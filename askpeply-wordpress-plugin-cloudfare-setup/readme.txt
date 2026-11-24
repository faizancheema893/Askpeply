=== AskPeply - AI Shopping Assistant & Compliance Chatbot for WooCommerce ===
Contributors: askpeply, techtonex
Tags: ai, chatbot, gemini, woocommerce, customer-service, sales-assistant, e-commerce
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Intelligent AI shopping assistant and compliance chatbot for WordPress & WooCommerce. Includes 20 free conversations.

== Description ==

AskPeply is an intelligent, high-conversion AI shopping assistant designed specifically for research, wellness, and e-commerce stores. Built with compliance-first guardrails, AskPeply answers customer questions directly from your own products, pages, and store policies while strictly blocking medical, dosing, or unauthorized claims.

Every new WordPress store starts with **20 free conversations** out of the box with zero configuration required.

= Key Features =

* **Instant Out-of-the-Box Operation**: Every store gets 20 free conversations immediately upon activation. No API keys or credit card required to start.
* **Automatic Store Sync**: Automatically indexes WooCommerce products, WordPress pages, and store policies into an intelligent searchable knowledge base.
* **Grounded AI Answers**: Responds strictly from your store's verified facts. No AI hallucinations.
* **Compliance-First Guardrails**: Intercepts dosing, administration, human use, and medical inquiries before reaching the AI, offering safe research-compliant responses.
* **Custom Blocked Topics**: Prevent competitor mentions and custom sensitive keywords (Growth and Pro plans).
* **WooCommerce Order Tracking**: Real-time order lookup in chat with email security verification.
* **Document Knowledge Extraction**: Pro plan allows uploading lab reports, COAs, and pricing PDFs directly into your knowledge base.
* **Floating AskBar**: Sleek typewriter rotation, ambient glow presets (Nebula, Clean lab, Emerald, Graphite, Rose gold), microphone voice input, and audio chime effects.
* **Conversation Analytics**: Monitor conversations, filter by flag (answered, blocked, escalated), and review customer inquiries.

= Free Trial & Flexible Plans =

* **Free Trial**: 20 free AI conversations included for all new stores.
* **Starter ($49/mo)**: 1,000 conversations/month, 24/7 instant replies, core compliance.
* **Growth ($99/mo)**: 5,000 conversations/month, WooCommerce order tracking in chat, advanced custom guardrails, and smart escalation.
* **Pro ($199/mo)**: 20,000 conversations/month, document knowledge upload (PDF, COA, lab sheets), priority AI speed, and dedicated support.

== External / Third-Party Services ==

This plugin relies on external 3rd-party cloud services to provide artificial intelligence processing and manage subscription license validation.

By installing and using AskPeply, your WordPress site communicates with the following external service:

* **AskPeply Central License & AI Gateway (Powered by Cloudflare Workers & Google Gemini API)**
  * **Service URL**: `https://askpeply.manzarrizvi43.workers.dev` (Central AI & License Gateway) and `https://generativelanguage.googleapis.com` (Google Gemini API).
  * **Service Purpose**:
    1. License Verification & Anti-Abuse: Verifies active customer subscription plans and tracks the 20-conversation free trial quota by store domain.
    2. Secure AI Proxy: Securely processes customer chat queries through Google Gemini generative models without exposing private API keys in client-side code.
  * **Data Transmitted**:
    1. Active license key (or `FREE` for trial mode).
    2. Store domain name (`$_SERVER['SERVER_NAME']`) to prevent license piracy and enforce single-domain locking.
    3. Customer chat prompt messages and matched store knowledge context necessary to generate grounded replies.
    4. *Note on Privacy*: No personal customer information, credit cards, or passwords are ever transmitted or stored.
  * **Terms of Service**: [AskPeply Terms](https://askpeply.com/terms)
  * **Privacy Policy**: [AskPeply Privacy Policy](https://askpeply.com/privacy)
  * **Google Gemini AI Terms**: [Google AI Terms of Service](https://ai.google.dev/terms) and [Google Privacy Policy](https://policies.google.com/privacy)

== Installation ==

1. Upload the `askpeply` folder to your `/wp-content/plugins/` directory, or upload the zip file directly via **Plugins > Add New > Upload Plugin** in your WordPress admin.
2. Activate the plugin through the **Plugins** menu.
3. Your 20 free conversations are instantly active! Navigate to **AskPeply > Knowledge** and click **Sync store** to index your products and pages.
4. Customize your chat widget colors and wording in **AskPeply > Assistant**.
5. When your store grows beyond 20 conversations, enter your license key in **AskPeply > Plans**.

== Frequently Asked Questions ==

= Does AskPeply include free conversations? =
Yes! Every new store receives 20 free live conversations to test and experience the AI assistant on their live website.

= What happens when my store uses all 20 free conversations? =
Once the 20 conversations are completed, the assistant will pause live replies and notify visitors politely. You can enter an AskPeply license key under the Plans tab at any time to instantly reactivate and scale your limit.

= Can someone reset the 20 free chats by reinstalling the plugin? =
No. For store security and anti-abuse protection, free trial usage is securely verified by domain. Reinstalling or clearing local settings does not reset your store's conversation count.

= Does AskPeply require WooCommerce? =
AskPeply works seamlessly with standard WordPress pages, posts, and policies. If WooCommerce is installed, it automatically indexes products and enables real-time order status tracking.

= Does AskPeply prevent dosing and medical advice? =
Yes. AskPeply includes built-in compliance guardrails that identify and refuse inquiries regarding dosing, human consumption, and medical claims, keeping your store fully aligned with research chemical and compliance standards.

= Where is customer chat data processed? =
Chat messages are securely processed via the AskPeply Central Cloudflare AI Gateway and Google Gemini API to ensure fast response times and strict security. No payment or personal user credentials are ever transmitted.

= How do I upgrade my plan? =
You can upgrade at any time by visiting AskPeply.com or clicking the upgrade button inside **AskPeply > Plans** in your WordPress admin. Once purchased on Shopify, your license key is activated instantly.

== Screenshots ==

1. Floating AskBar with ambient glow and live question rotation on the storefront.
2. AI conversation panel answering customer questions grounded in store knowledge.
3. WordPress Admin Knowledge dashboard with WooCommerce product sync.
4. Compliance guardrails and tone configuration panel.
5. Conversation logs with filterable status flags (answered, blocked, escalated).
6. Plans and license management with real-time monthly usage meter.

== Changelog ==

= 1.0.4 =
* Added Free Trial tier with 20 conversations out-of-the-box.
* Central Cloudflare AI Gateway integration with domain-locked licensing.
* Added microphone voice input toggle in admin wording settings.
* Added Web Audio API sound effect synthesis for sending and replies.
* Added PDF and COA multimodal document extraction for Pro plan.
* Enhanced anti-abuse domain verification.
* Full compatibility with WordPress 6.7 and WooCommerce 9.x.

= 1.0.0 =
* Initial commercial release for WordPress & WooCommerce.

== Upgrade Notice ==

= 1.0.4 =
Includes 20 free out-of-the-box conversations, compliance guardrails, and central Cloudflare AI gateway integration.
