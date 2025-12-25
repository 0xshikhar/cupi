import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  return NextResponse.next();
}

// See https://nextjs.org/docs/app/building-your-application/routing/middleware
export const config = {

};
