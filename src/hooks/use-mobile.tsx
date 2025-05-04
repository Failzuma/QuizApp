
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Initialize state to undefined to clearly indicate it hasn't been determined yet (SSR)
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Check if window is defined (runs only on client-side)
    if (typeof window === 'undefined') {
      return; // Do nothing on the server
    }

    // Function to update the state based on window width
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check when the component mounts on the client
    checkDevice();

    // Add resize event listener
    window.addEventListener('resize', checkDevice);

    // Cleanup function to remove the listener when the component unmounts
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []); // Empty dependency array ensures this runs only once on mount (client-side)

  // Return the state (will be undefined during SSR, boolean on client after mount)
  return isMobile;
}
