import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. Define exactly which routes anyone can see
const PUBLIC_FILE_EXTENSIONS = /\.(.*)$/; // Matches files like .png, .jpg, .svg, .ico
const PUBLIC_PATHS = [
    '/login',
    '/register',
    '/forgot-password',
    '/api/public', // If you have public API routes
    '/',           // Landing page
];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('auth_token');

    // 2. Allow all internal Next.js assets and static files
    // Without this, your CSS and Images will be blocked!
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        PUBLIC_FILE_EXTENSIONS.test(pathname)
    ) {
        return NextResponse.next();
    }

    // 3. Check if the current path is in our whitelist
    const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path);

    // 4. If it's NOT public and there's no token, boot them to login
    if (!isPublicPath && !token) {
        const loginUrl = new URL('/login', request.url);
        // Optional: Store the attempted URL to redirect back after login
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

// 5. Use a "Catch-All" matcher
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (if you want your API to handle its own auth)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};