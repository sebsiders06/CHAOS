const menuToggle = document.querySelector("[data-menu-toggle]");
const siteHeader = document.querySelector("[data-header]");
const navLinks = document.querySelector("[data-nav]");
const revealItems = document.querySelectorAll("[data-reveal]");
const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");
const submitButton = document.querySelector("[data-submit-button]");
const submitLabel = document.querySelector("[data-submit-label]");
const currentYear = new Date().getFullYear();

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
    const companyWebsite = String(formData.get("companyWebsite") || "").trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    formStatus.className = "form-status";

    if (companyWebsite) {
      formStatus.textContent = "La demande n'a pas pu être envoyée.";
      formStatus.classList.add("is-error");
      return;
    }

    if (!name || !email || !message) {
      formStatus.textContent = "Merci de renseigner votre nom, votre e-mail et votre message.";
      formStatus.classList.add("is-error");
      return;
    }

    if (!emailPattern.test(email)) {
      formStatus.textContent = "Renseignez une adresse e-mail valide pour recevoir votre réponse.";
      formStatus.classList.add("is-error");
      return;
    }

    if (name.length > 120 || email.length > 160 || subject.length > 160 || message.length > 5000) {
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
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          companyWebsite
        })
      });

      const result = await response.json();

      formStatus.textContent = result.message || "Une réponse du serveur a été reçue.";
      formStatus.classList.add(response.ok ? "is-success" : "is-error");

      if (response.ok) {
        contactForm.reset();
      }
    } catch (error) {
      formStatus.textContent =
        "Une erreur est survenue pendant l'envoi. Merci de réessayer dans quelques instants.";
      formStatus.classList.add("is-error");
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
