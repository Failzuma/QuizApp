
import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Renamed to useMobile to match the import statement in the game page.
export function useMobile() {
  // Initialize state to a default (false), and only update on the client.
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // This effect runs only on the client-side after the component has mounted.
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check
    checkDevice();

    // Add resize event listener
    window.addEventListener('resize', checkDevice);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []); // Empty dependency array ensures this runs only once on the client.

  return isMobile;
}
