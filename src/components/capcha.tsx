import React, { useEffect } from "react";

interface RecaptchaProps {
  siteKey: string;
}

declare global {
  interface Window {
    grecaptcha: any;
    onloadCallback: () => void;
  }
}

const Recaptcha: React.FC<RecaptchaProps> = ({ siteKey }) => {
  useEffect(() => {
    // Check if the grecaptcha script is already loaded
    if (!document.getElementById("recaptcha-script")) {
      const script = document.createElement("script");
      script.src =
        "https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit";
      script.async = true;
      script.defer = true;
      script.id = "recaptcha-script";
      document.body.appendChild(script);

      // Define the onload callback function
      (window as any).onloadCallback = () => {
        if (window.grecaptcha) {
          window.grecaptcha.render("recaptcha-container", {
            sitekey: siteKey,
          });
        }
      };
    } else {
      // If the script is already loaded, render the captcha immediately
      if (window.grecaptcha) {
        window.grecaptcha.render("recaptcha-container", {
          sitekey: siteKey,
        });
      }
    }
  }, [siteKey]);

  return (
    <form action="?" method="POST">
      <div id="recaptcha-container" />
    </form>
  );
};

export default Recaptcha;
