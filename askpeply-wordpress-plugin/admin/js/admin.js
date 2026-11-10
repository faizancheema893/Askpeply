/**
 * AskPeply WordPress Admin Script
 * Handles light/dark themes, real-time live preview, test chats, sync, uploads, and plan management.
 *
 * @package AskPeply
 */

(function ($) {
  "use strict";

  var THEME_KEY = "askpeply:theme";

  // Toast notification helper
  function showToast(message, isError) {
    $(".ap-toast").remove();
    var $toast = $('<div class="ap-toast' + (isError ? " is-error" : "") + '"></div>').text(message);
    $("body").append($toast);
    setTimeout(function () {
      $toast.fadeOut(300, function () { $toast.remove(); });
    }, 3800);
  }

  window.AskPeplyAdmin = {
    toast: showToast
  };

  $(document).ready(function () {
    var $wrap = $(".ap-admin-wrap");
    var ajaxurl = window.askpeplyAdminData ? window.askpeplyAdminData.ajaxUrl : window.ajaxurl;
    var nonce = window.askpeplyAdminData ? window.askpeplyAdminData.nonce : "";

    /* -------------------------------------------------------------
     * 1. Theme Mode: Default is LIGHT MODE with full-canvas dark coverage!
     * ----------------------------------------------------------- */
    function setTheme(mode) {
      if (mode === "dark") {
        document.documentElement.classList.add("ap-dark");
        document.body.classList.add("ap-dark");
        $wrap.addClass("ap-dark");
        $("#wpcontent, #wpbody, #wpbody-content").addClass("ap-dark").css("background", "#0B0E14");
        $(".ap-theme-btn[data-theme='dark']").attr("aria-pressed", "true");
        $(".ap-theme-btn[data-theme='light']").attr("aria-pressed", "false");
      } else {
        document.documentElement.classList.remove("ap-dark");
        document.body.classList.remove("ap-dark");
        $wrap.removeClass("ap-dark");
        $("#wpcontent, #wpbody, #wpbody-content").removeClass("ap-dark").css("background", "");
        $(".ap-theme-btn[data-theme='light']").attr("aria-pressed", "true");
        $(".ap-theme-btn[data-theme='dark']").attr("aria-pressed", "false");
      }
      try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
    }

    var savedTheme = null;
    try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (savedTheme === "dark") {
      setTheme("dark");
    } else {
      setTheme("light"); // Default is explicitly LIGHT MODE!
    }

    $(document).on("click", ".ap-theme-btn", function () {
      var t = $(this).data("theme");
      setTheme(t);
    });

    /* -------------------------------------------------------------
     * 2. Navigation Tabs
     * ----------------------------------------------------------- */
    function switchTab(tabId) {
      $(".ap-nav-tab").removeClass("is-active");
      $(".ap-nav-tab[data-tab='" + tabId + "']").addClass("is-active");

      $(".ap-tab-pane").hide();
      $("#ap-tab-" + tabId).show();

      window.location.hash = "tab=" + tabId;
    }

    $(document).on("click", ".ap-nav-tab, .ap-tab-link", function (e) {
      e.preventDefault();
      var tab = $(this).data("tab");
      if (tab) {
        switchTab(tab);
      }
    });

    if (window.location.hash) {
      var match = window.location.hash.match(/tab=([a-z0-9_-]+)/);
      if (match && $("#ap-tab-" + match[1]).length) {
        switchTab(match[1]);
      }
    }

    /* -------------------------------------------------------------
     * 3. Master Enabled Switch
     * ----------------------------------------------------------- */
    $("#ap-master-toggle").on("change", function () {
      var active = $(this).is(":checked");
      $("#ap-master-status-text").text(active ? "Active" : "Inactive").toggleClass("is-on", active);

      $.post(ajaxurl, {
        action: "askpeply_toggle_active",
        nonce: nonce,
        enabled: active ? 1 : 0
      }).done(function (res) {
        if (res.success) {
          showToast(active ? "AskPeply assistant activated" : "AskPeply assistant turned off");
        }
      });
    });

    /* -------------------------------------------------------------
     * 4. Assistant Live Preview & Infallible Real-Time Color Sync
     * ----------------------------------------------------------- */
    function updatePreviewVars() {
      var previewEl = document.getElementById("ap-preview-root");
      if (!previewEl) return;

      var colors = {};
      $(".ap-color-hex").each(function () {
        var key = $(this).data("key");
        var val = $(this).val() || $(this).closest(".ap-color").find(".ap-color-input").val();
        if (key && val) {
          colors[key] = val;
        }
      });

      // 1. Set CSS variables on preview container via vanilla DOM
      if (colors.barBg) previewEl.style.setProperty("--apb-bar-bg", colors.barBg);
      if (colors.barText) previewEl.style.setProperty("--apb-bar-text", colors.barText);
      if (colors.panelBg) previewEl.style.setProperty("--apb-panel-bg", colors.panelBg);
      if (colors.chipBg) previewEl.style.setProperty("--apb-chip-bg", colors.chipBg);
      if (colors.chipText) previewEl.style.setProperty("--apb-chip-text", colors.chipText);
      if (colors.botBg) previewEl.style.setProperty("--apb-bot-bg", colors.botBg);
      if (colors.botText) previewEl.style.setProperty("--apb-bot-text", colors.botText);
      if (colors.userBg) previewEl.style.setProperty("--apb-user-bg", colors.userBg);
      if (colors.userText) previewEl.style.setProperty("--apb-user-text", colors.userText);
      if (colors.noteColor) previewEl.style.setProperty("--apb-note", colors.noteColor);
      if (colors.accentCyan) previewEl.style.setProperty("--ap-cyan", colors.accentCyan);
      if (colors.accentViolet) previewEl.style.setProperty("--ap-violet", colors.accentViolet);
      if (colors.accentFuchsia) previewEl.style.setProperty("--ap-fuchsia", colors.accentFuchsia);

      // 2. ALSO DIRECTLY update inline styles so it never fails
      if (colors.barBg) {
        $("#ap-mock-bar-element").css("background-color", colors.barBg);
      }
      if (colors.barText) {
        $("#ap-mock-input-field").css("color", colors.barText);
        $("#ap-mock-typing").css("color", colors.barText);
      }
      if (colors.panelBg) {
        $("#ap-mock-chat-panel").css("background-color", colors.panelBg);
      }
      if (colors.chipBg) {
        $(".ap-mock-chip").css("background-color", colors.chipBg);
      }
      if (colors.chipText) {
        $(".ap-mock-chip").css("color", colors.chipText);
      }
      if (colors.botBg) {
        $(".ap-mock-bot-bubble").css("background-color", colors.botBg);
      }
      if (colors.botText) {
        $(".ap-mock-bot-bubble").css("color", colors.botText);
      }
      if (colors.userBg) {
        $(".ap-mock-user-bubble").css("background-color", colors.userBg);
      }
      if (colors.userText) {
        $(".ap-mock-user-bubble").css("color", colors.userText);
      }
      if (colors.noteColor) {
        $("#ap-mock-note-element").css("color", colors.noteColor);
      }
      if (colors.accentViolet || colors.accentFuchsia || colors.accentCyan) {
        var v = colors.accentViolet || "#8B5CF6";
        var f = colors.accentFuchsia || "#D946EF";
        var c = colors.accentCyan || "#38BDF8";
        $(".ap-mock-send-btn").css("background", "linear-gradient(135deg, " + v + ", " + f + " 65%, " + c + ")");
      }

      // Name & wording live update
      var botName = $("input[name='botName']").val() || "AskPeply";
      $(".ap-mock-title-text").text(botName + " · Live");
      $(".ap-mock-bot-avatar").text(botName.charAt(0).toUpperCase());

      var placeholder = $("input[name='placeholder']").val() || "Ask anything…";
      $("#ap-mock-input-field").attr("placeholder", placeholder);

      var note = $("input[name='note']").val() || "AI answers can be imperfect. Products are for research use only.";
      $("#ap-mock-note-element").text(note);

      // Typing line for closed bar
      var typingLines = $("textarea[name='typingLines']").val() || "";
      var firstLine = typingLines.split("\n")[0];
      if (firstLine && firstLine.trim()) {
        $("#ap-mock-typing").html(escHtml(firstLine.trim()) + '<span class="ap-mock-cursor">|</span>');
      }

      // Chips update
      var $chips = $("#ap-mock-chips-container").empty();
      for (var i = 0; i < 4; i++) {
        var q = $("input[name='q" + i + "']").val();
        if (q && q.trim()) {
          var $chip = $('<button type="button" class="ap-mock-chip"></button>').text(q.trim());
          if (colors.chipBg) $chip.css("background-color", colors.chipBg);
          if (colors.chipText) $chip.css("color", colors.chipText);
          $chips.append($chip);
        }
      }
      if ($chips.children().length === 0) {
        var defaultChips = [
          "How long does shipping take?",
          "Can I see the COA for a product?",
          "What is your refund policy?"
        ];
        defaultChips.forEach(function (dq) {
          var $chip = $('<button type="button" class="ap-mock-chip"></button>').text(dq);
          if (colors.chipBg) $chip.css("background-color", colors.chipBg);
          if (colors.chipText) $chip.css("color", colors.chipText);
          $chips.append($chip);
        });
      }
    }

    // Color well change
    $(document).on("input change", ".ap-color-well input", function () {
      var val = $(this).val().toUpperCase();
      var key = $(this).data("key");
      var $row = $(this).closest(".ap-color");
      $row.find(".ap-color-hex").val(val);
      $row.find(".ap-color-well").css("background", val);
      updatePreviewVars();
    });

    // Hex input change
    $(document).on("input change", ".ap-color-hex", function () {
      var val = $(this).val().trim();
      if (val && !val.startsWith("#")) val = "#" + val;
      if (/^#[0-9A-F]{6}$/i.test(val)) {
        val = val.toUpperCase();
        var $row = $(this).closest(".ap-color");
        $row.find(".ap-color-well input").val(val);
        $row.find(".ap-color-well").css("background", val);
        updatePreviewVars();
      }
    });

    // Theme preset clicks (Nebula, Clean lab, Emerald, Graphite, Rose gold)
    $(document).on("click", ".ap-theme", function () {
      var themeData = $(this).data("colors");
      if (typeof themeData === "string") {
        try { themeData = JSON.parse(themeData); } catch (e) {}
      }
      if (!themeData) return;

      $(".ap-theme").attr("aria-pressed", "false").removeClass("is-active");
      $(this).attr("aria-pressed", "true").addClass("is-active");

      for (var k in themeData) {
        var val = themeData[k];
        $(".ap-color-hex[data-key='" + k + "']").val(val);
        var $wellInput = $(".ap-color-input[data-key='" + k + "']").val(val);
        $wellInput.closest(".ap-color-well").css("background", val);
      }
      updatePreviewVars();
    });

    // Preview state segmented control (closed | open | chat)
    $(document).on("click", ".ap-preview-state-btn", function () {
      $(".ap-preview-state-btn").attr("aria-pressed", "false").removeClass("is-active");
      $(this).attr("aria-pressed", "true").addClass("is-active");
      var state = $(this).data("state");

      var $root = $("#ap-preview-root");
      $root.removeClass("is-closed is-open is-chat");

      if (state === "closed") {
        $root.addClass("is-closed");
      } else if (state === "chat") {
        $root.addClass("is-chat");
      } else {
        $root.addClass("is-open");
      }
      updatePreviewVars();
    });

    // Store mode preview (light store | dark store)
    $(document).on("click", ".ap-preview-store-btn", function () {
      $(".ap-preview-store-btn").attr("aria-pressed", "false").removeClass("is-active");
      $(this).attr("aria-pressed", "true").addClass("is-active");
      var storeTheme = $(this).data("theme");

      $("#ap-mock-shop").removeClass("ap-shop--light ap-shop--dark").addClass("ap-shop--" + storeTheme);
    });

    // Trigger preview on input changes
    $(document).on("input", "input[name='botName'], input[name='placeholder'], input[name='note'], textarea[name='typingLines'], input[name^='q']", function () {
      updatePreviewVars();
    });

    // Run preview sync initially
    updatePreviewVars();

    /* -------------------------------------------------------------
     * 5. Save Settings & Guardrails
     * ----------------------------------------------------------- */
    $("#ap-save-assistant-btn").on("click", function () {
      var $btn = $(this);
      $btn.prop("disabled", true).text("Saving…");

      var data = {
        action: "askpeply_save_settings",
        nonce: nonce,
        botName: $("input[name='botName']").val(),
        placeholder: $("input[name='placeholder']").val(),
        typingLines: $("textarea[name='typingLines']").val(),
        note: $("input[name='note']").val(),
        sound: $("input[name='sound']").is(":checked") ? 1 : 0,
        orderTracking: $("input[name='orderTracking']").is(":checked") ? 1 : 0,
        position: $("select[name='position']").val(),
        sideOffset: $("input[name='sideOffset']").val(),
        bottomOffset: $("input[name='bottomOffset']").val(),
        fallbackAnswer: $("textarea[name='fallbackAnswer']").val(),
        offlineAnswer: $("textarea[name='offlineAnswer']").val()
      };

      for (var i = 0; i < 4; i++) {
        data["q" + i] = $("input[name='q" + i + "']").val() || "";
        data["a" + i] = $("textarea[name='a" + i + "']").val() || "";
        data["k" + i] = $("input[name='k" + i + "']").val() || "";
      }

      $(".ap-color-hex").each(function () {
        data[$(this).data("key")] = $(this).val();
      });

      $.post(ajaxurl, data).done(function (res) {
        $btn.prop("disabled", false).text("Save and publish");
        if (res.success) {
          showToast("Settings published to store");
        } else {
          showToast(res.data ? res.data.message : "Save failed", true);
        }
      }).fail(function () {
        $btn.prop("disabled", false).text("Save and publish");
        showToast("Request failed", true);
      });
    });

    $("#ap-save-guardrails-btn").on("click", function () {
      var $btn = $(this);
      $btn.prop("disabled", true).text("Saving…");

      var data = {
        action: "askpeply_save_guardrails",
        nonce: nonce,
        blockDosing: $("input[name='blockDosing']").is(":checked") ? 1 : 0,
        blockHumanUse: $("input[name='blockHumanUse']").is(":checked") ? 1 : 0,
        blockMedical: $("input[name='blockMedical']").is(":checked") ? 1 : 0,
        blockOffLabel: $("input[name='blockOffLabel']").is(":checked") ? 1 : 0,
        refusalMessage: $("textarea[name='refusalMessage']").val(),
        blockedTopics: $("textarea[name='blockedTopics']").val(),
        tone: $("select[name='tone']").val(),
        disclaimer: $("input[name='disclaimer']").val(),
        appendDisclaimer: $("input[name='appendDisclaimer']").is(":checked") ? 1 : 0,
        customInstructions: $("textarea[name='customInstructions']").val(),
        retentionDays: $("select[name='retentionDays']").val(),
        supportEmail: $("input[name='supportEmail']").val(),
        escalateBlocked: $("input[name='escalateBlocked']").is(":checked") ? 1 : 0
      };

      $.post(ajaxurl, data).done(function (res) {
        $btn.prop("disabled", false).text("Save guardrails");
        if (res.success) {
          showToast("Guardrails saved");
        } else {
          showToast("Failed to save guardrails", true);
        }
      }).fail(function () {
        $btn.prop("disabled", false).text("Save guardrails");
        showToast("Request failed", true);
      });
    });

    /* -------------------------------------------------------------
     * 6. Knowledge Store Sync & Management
     * ----------------------------------------------------------- */
    $(document).on("click", ".ap-sync-btn", function () {
      var $btn = $(this);
      $btn.prop("disabled", true).text("Syncing store…");

      $.post(ajaxurl, {
        action: "askpeply_sync_knowledge",
        nonce: nonce
      }).done(function (res) {
        $btn.prop("disabled", false).text("Sync store");
        if (res.success) {
          showToast("Synced " + res.data.products + " products, " + res.data.pages + " pages, and " + res.data.policies + " policies");
          setTimeout(function () { window.location.reload(); }, 1200);
        } else {
          showToast("Sync failed: " + (res.data ? res.data.message : ""), true);
        }
      }).fail(function () {
        $btn.prop("disabled", false).text("Sync store");
        showToast("Sync request failed", true);
      });
    });

    // Add Custom Q&A
    $("#ap-add-qa-btn").on("click", function () {
      var q = $("#ap-qa-question").val().trim();
      var a = $("#ap-qa-answer").val().trim();
      if (!q || !a) {
        showToast("Please enter both question and answer", true);
        return;
      }

      var $btn = $(this).prop("disabled", true);
      $.post(ajaxurl, {
        action: "askpeply_add_knowledge",
        nonce: nonce,
        question: q,
        answer: a
      }).done(function (res) {
        $btn.prop("disabled", false);
        if (res.success) {
          showToast("Q&A pair added to knowledge");
          $("#ap-qa-question").val("");
          $("#ap-qa-answer").val("");
          setTimeout(function () { window.location.reload(); }, 900);
        } else {
          showToast("Failed to add Q&A", true);
        }
      }).fail(function () {
        $btn.prop("disabled", false);
        showToast("Request failed", true);
      });
    });

    // Delete Knowledge Item
    $(document).on("click", ".ap-delete-knowledge-btn", function () {
      if (!confirm("Are you sure you want to remove this knowledge item?")) return;
      var id = $(this).data("id");
      var $row = $(this).closest(".ap-knowledge-row");

      $.post(ajaxurl, {
        action: "askpeply_delete_knowledge",
        nonce: nonce,
        id: id
      }).done(function (res) {
        if (res.success) {
          $row.fadeOut(200, function () { $row.remove(); });
          showToast("Item removed");
        }
      });
    });

    // Filter Knowledge Items
    $(document).on("click", ".ap-source-tab", function () {
      $(".ap-source-tab").removeClass("is-active").attr("aria-pressed", "false");
      $(this).addClass("is-active").attr("aria-pressed", "true");
      var src = $(this).data("source");

      if (src === "all") {
        $(".ap-knowledge-row").show();
      } else {
        $(".ap-knowledge-row").hide();
        $(".ap-knowledge-row[data-source='" + src + "']").show();
      }
    });

    // Instant Search in Knowledge
    $("#ap-knowledge-search").on("input", function () {
      var q = $(this).val().toLowerCase().trim();
      $(".ap-knowledge-row").each(function () {
        var text = $(this).text().toLowerCase();
        $(this).toggle(text.indexOf(q) !== -1);
      });
    });

    // Document Upload (Pro Plan)
    $("#ap-doc-file-input").on("change", function () {
      var file = this.files[0];
      if (!file) return;

      var formData = new FormData();
      formData.append("action", "askpeply_upload_document");
      formData.append("nonce", nonce);
      formData.append("document", file);

      $("#ap-doc-label").text("Uploading & parsing with AI…");

      $.ajax({
        url: ajaxurl,
        type: "POST",
        data: formData,
        processData: false,
        contentType: false
      }).done(function (res) {
        $("#ap-doc-label").text("Choose a file");
        if (res.success) {
          showToast("Document indexed into knowledge base");
          setTimeout(function () { window.location.reload(); }, 1200);
        } else {
          showToast("Upload failed: " + (res.data ? res.data.message : ""), true);
        }
      }).fail(function () {
        $("#ap-doc-label").text("Choose a file");
        showToast("Upload request failed", true);
      });
    });

    /* -------------------------------------------------------------
     * 7. Plans Switch
     * ----------------------------------------------------------- */
    $(document).on("click", ".ap-switch-plan-btn", function () {
      var plan = $(this).data("plan");
      var $btn = $(this).prop("disabled", true).text("Switching…");

      $.post(ajaxurl, {
        action: "askpeply_switch_plan",
        nonce: nonce,
        plan: plan
      }).done(function (res) {
        if (res.success) {
          showToast("Plan switched to " + res.data.name);
          setTimeout(function () { window.location.reload(); }, 900);
        } else {
          $btn.prop("disabled", false).text("Switch to " + plan);
          showToast("Plan switch failed", true);
        }
      }).fail(function () {
        $btn.prop("disabled", false).text("Switch to " + plan);
        showToast("Switch failed", true);
      });
    });

    /* -------------------------------------------------------------
     * 8. Test Chat (Admin Playground)
     * ----------------------------------------------------------- */
    var testConvId = null;

    function sendTestChat(questionText, $trigger) {
      if (!questionText) return;

      var $card = $trigger ? $trigger.closest(".ap-card") : $(".ap-tab-pane:visible .ap-card:has(.ap-chat__feed)");
      var $feed = $card.length ? $card.find(".ap-chat__feed") : $(".ap-chat__feed").first();

      $feed.append(
        '<div class="ap-msg ap-msg--user"><div class="ap-bubble">' + escHtml(questionText) + '</div></div>'
      );

      var $typing = $(
        '<div class="ap-msg ap-msg--bot ap-admin-typing-indicator">' +
          '<span class="ap-avatar">A</span>' +
          '<div class="ap-bubble ap-typing"><i></i><i></i><i></i></div>' +
        '</div>'
      );
      $feed.append($typing);
      $feed.scrollTop($feed[0].scrollHeight);

      function removeTyping() {
        $feed.find(".ap-admin-typing-indicator").remove();
        $("#ap-admin-typing").remove();
      }

      function renderBotReply(res) {
        removeTyping();
        var data = (res && res.data) ? res.data : res;
        if (data && data.reply) {
          testConvId = data.conversationId;
          var html = renderMarkdown(data.reply);
          var $botMsg = $(
            '<div class="ap-msg ap-msg--bot">' +
              '<span class="ap-avatar">A</span>' +
              '<div class="ap-bubble">' + html + '</div>' +
            '</div>'
          );
          if (data.status === "blocked") {
            $botMsg.find(".ap-bubble").css("border-left", "3px solid #EF4444");
          }
          $feed.append($botMsg);
        } else {
          $feed.append(
            '<div class="ap-msg ap-msg--bot"><span class="ap-avatar">A</span><div class="ap-bubble ap-err">No response</div></div>'
          );
        }
        $feed.scrollTop($feed[0].scrollHeight);
      }

      function handleFailure(err) {
        removeTyping();
        var errMsg = (err && err.responseJSON && (err.responseJSON.message || err.responseJSON.error)) ||
                     (err && err.responseText) ||
                     "Connection error. Please try again.";
        $feed.append(
          '<div class="ap-msg ap-msg--bot"><span class="ap-avatar">A</span><div class="ap-bubble ap-err">' + escHtml(errMsg) + '</div></div>'
        );
        $feed.scrollTop($feed[0].scrollHeight);
      }

      var restUrl = (window.askpeplyAdminData && (window.askpeplyAdminData.restTestUrl || (window.askpeplyAdminData.restUrl + "test"))) || "/wp-json/askpeply/v1/test";
      var restNonce = window.askpeplyAdminData ? (window.askpeplyAdminData.restNonce || window.askpeplyAdminData.nonce) : "";
      var adminNonce = window.askpeplyAdminData ? window.askpeplyAdminData.nonce : "";

      // Try REST endpoint first
      $.ajax({
        url: restUrl,
        type: "POST",
        contentType: "application/json",
        beforeSend: function (xhr) {
          if (restNonce) {
            xhr.setRequestHeader("X-WP-Nonce", restNonce);
          }
          if (adminNonce) {
            xhr.setRequestHeader("X-AskPeply-Nonce", adminNonce);
          }
        },
        data: JSON.stringify({
          messages: [{ role: "user", content: questionText }],
          conversationId: testConvId
        })
      }).done(function (res) {
        renderBotReply(res);
      }).fail(function () {
        // Fallback to admin-ajax.php if REST is blocked by host firewall
        $.post(ajaxurl, {
          action: "askpeply_test_chat",
          nonce: adminNonce,
          question: questionText,
          conversationId: testConvId
        }).done(function (res) {
          if (res.success && res.data) {
            renderBotReply(res.data);
          } else {
            handleFailure(res);
          }
        }).fail(function (err) {
          handleFailure(err);
        });
      });
    }

    $(document).on("click", ".ap-test-send-btn", function () {
      var $input = $(this).closest(".ap-card").find(".ap-test-input");
      var text = $input.val().trim();
      if (!text) return;
      $input.val("");
      sendTestChat(text, $(this));
    });

    $(document).on("keydown", ".ap-test-input", function (e) {
      if (e.which === 13) {
        e.preventDefault();
        var text = $(this).val().trim();
        if (!text) return;
        $(this).val("");
        sendTestChat(text, $(this));
      }
    });

    $(document).on("click", ".ap-chip", function () {
      var text = $(this).text().trim();
      sendTestChat(text, $(this));
    });

    $(document).on("click", ".ap-new-chat-btn", function () {
      testConvId = null;
      var $feed = $(this).closest(".ap-card").find(".ap-chat__feed");
      if (!$feed.length) $feed = $(".ap-chat__feed");
      $feed.empty();
      showToast("Started a new test chat");
    });

    /* -------------------------------------------------------------
     * 9. Conversations: Mark as Handled
     * ----------------------------------------------------------- */
    $(document).on("click", ".ap-resolve-conv-btn", function () {
      var id = $(this).data("id");
      var $btn = $(this).prop("disabled", true);

      $.post(ajaxurl, {
        action: "askpeply_resolve_conversation",
        nonce: nonce,
        id: id
      }).done(function (res) {
        $btn.prop("disabled", false);
        if (res.success) {
          showToast("Conversation marked as handled");
          $btn.remove();
          $("#ap-conv-status-tag").removeClass("ap-tag--escalated ap-tag--unanswered").addClass("ap-tag--answered").text("Answered");
        }
      });
    });

    /* Helper: Escaping & Markdown */
    function escHtml(s) {
      return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function renderMarkdown(text) {
      var s = escHtml(text);
      s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      s = s.replace(/\n/g, "<br>");
      return s;
    }
  });
})(jQuery);
