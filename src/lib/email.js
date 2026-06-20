import emailjs from '@emailjs/browser';

export function sendFeedback({ title, body, results }) {
    emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

    return emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
            title,
            body,
            results,
            to_email: 'devteam@nat20app.com',
            name: 'Nat20 User',
            email: 'feedback@nat20app.com',
        }
    );
}
