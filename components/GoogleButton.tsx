import { Button } from "./ui/Button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.5-1.7 4.5-5.4 4.5-3.2 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 4 14.6 3 12 3 6.9 3 2.8 7.1 2.8 12.2S6.9 21.5 12 21.5c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.2H12z"
      />
    </svg>
  );
}

export function GoogleButton({ label }: { label: string }) {
  return (
    <Button
      variant="secondary"
      size="md"
      className="w-full"
      leftIcon={<GoogleIcon />}
    >
      {label}
    </Button>
  );
}
