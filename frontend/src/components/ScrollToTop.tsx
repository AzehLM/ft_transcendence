import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// listen to pathname changes and reset the window scroll pos to 0, 0 (top of the page)
// this is required as the default React Router behavior doesn't do that on its own
function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}

export default ScrollToTop;
