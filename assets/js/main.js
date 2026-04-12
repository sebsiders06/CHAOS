const menuToggle = document.querySelector("[data-menu-toggle]");
const siteHeader = document.querySelector("[data-header]");
const navLinks = document.querySelector("[data-nav]");
const revealItems = document.querySelectorAll("[data-reveal]");
const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");
const submitButton = document.querySelector("[data-submit-button]");
const submitLabel = document.querySelector("[data-submit-label]");
const CONTACT_FORM_ENDPOINT = "https://formsubmit.co/ajax/pixelsiders71@gmail.com";
const currentYear = new Date().getFullYear();

function logContactDebug(step, details) {
  if (typeof console === "undefined" || typeof console.info !== "function") {
    return;
  }

  if (details) {
    console.info(`[contact] ${step}`, details);
    return;
  }

  console.info(`[contact] ${step}`);
}

document.querySelectorAll("[data-current-year]").forEach((node) => {
  node.textContent = String(currentYear);
});

if (menuToggle && siteHeader && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteHeader.classList.toggle("nav-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteHeader.classList.remove("nav-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

if (revealItems.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -10% 0px"
    }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

if (contactForm && formStatus) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const websiteCheck = String(formData.get("websiteCheck") || "").trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const replyToField = contactForm.querySelector("[data-replyto-field]");
    const subjectField = contactForm.querySelector("[data-subject-field]");

    logContactDebug("submit triggered", {
      hasName: Boolean(name),
      hasEmail: Boolean(email),
      hasMessage: Boolean(message),
      hasSubject: Boolean(subject)
    });

    formStatus.className = "form-status";

    if (replyToField instanceof HTMLInputElement) {
      replyToField.value = email;
    }

    if (subjectField instanceof HTMLInputElement) {
      subjectField.value = subject
        ? `[Site Siders Pixel] ${subject}`
        : "[Site Siders Pixel] Nouvelle demande de contact";
    }

    if (websiteCheck) {
      logContactDebug("honeypot field filled", { websiteCheckLength: websiteCheck.length });
      formStatus.textContent = "La demande n'a pas pu être envoyée.";
      formStatus.classList.add("is-error");
      return;
    }

    if (!name || !email || !message) {
      logContactDebug("validation error", { reason: "missing_required_fields" });
      formStatus.textContent = "Merci de renseigner votre nom, votre e-mail et votre message.";
      formStatus.classList.add("is-error");
      return;
    }

    if (!emailPattern.test(email)) {
      logContactDebug("validation error", { reason: "invalid_email" });
      formStatus.textContent = "Renseignez une adresse e-mail valide pour recevoir votre réponse.";
      formStatus.classList.add("is-error");
      return;
    }

    if (name.length > 120 || email.length > 160 || subject.length > 160 || message.length > 5000) {
      logContactDebug("validation error", { reason: "input_too_long" });
      formStatus.textContent = "Merci de raccourcir certaines informations avant l'envoi.";
      formStatus.classList.add("is-error");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add("is-loading");
    }

    if (submitLabel) {
      submitLabel.textContent = "Envoi en cours...";
    }

    formStatus.textContent = "Envoi de votre message en cours...";

    try {
      if (typeof fetch !== "function") {
        throw new Error("FETCH_UNAVAILABLE");
      }

      const requestBody = new FormData();
      requestBody.set("name", name);
      requestBody.set("email", email);
      requestBody.set("subject", subject);
      requestBody.set("message", message);
      requestBody.set("_subject", subject ? `[Site Siders Pixel] ${subject}` : "[Site Siders Pixel] Nouvelle demande de contact");
      requestBody.set("_captcha", "false");
      requestBody.set("_template", "table");
      requestBody.set("_replyto", email);

      logContactDebug("sending ajax request", { endpoint: CONTACT_FORM_ENDPOINT });

      const response = await fetch(CONTACT_FORM_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json"
        },
        body: requestBody
      });

      let result = {};

      try {
        result = await response.json();
      } catch (parseError) {
        result = {};
      }

      logContactDebug("ajax response received", {
        ok: response.ok,
        status: response.status
      });

      if (!response.ok) {
        throw new Error(result.message || "FORM_SUBMIT_HTTP_ERROR");
      }

      formStatus.textContent = response.ok
        ? "Votre message a bien ete envoye. Nous revenons vers vous au plus vite."
        : result.message || "L'envoi n'a pas pu aboutir. Merci de reessayer dans quelques instants.";
      formStatus.classList.add(response.ok ? "is-success" : "is-error");

      if (response.ok) {
        contactForm.reset();
      }
    } catch (error) {
      logContactDebug("ajax failed, native fallback triggered", {
        message: error instanceof Error ? error.message : "unknown_error"
      });

      formStatus.textContent =
        "Envoi via la passerelle de secours en cours...";
      formStatus.classList.add("is-success");

      window.setTimeout(() => {
        HTMLFormElement.prototype.submit.call(contactForm);
      }, 150);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.classList.remove("is-loading");
      }

      if (submitLabel) {
        submitLabel.textContent = "Envoyer ma demande";
      }
    }
  });
}
