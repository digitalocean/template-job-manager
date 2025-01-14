import React from 'react';

export default function Footer() {
    return (
        <footer className="bg-gray-200 text-gray-400 p-4 text-center">
            <p>
                &copy; {new Date().getFullYear()} DigitalOcean. All rights reserved.
            </p>
        </footer>
    );
};
