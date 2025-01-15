import { metadata } from "@/app/layout";
import Image from "next/image";
import digitaloceanLogo from "@/../public/digitalocean.svg";

export default function Header() {
    return (
        <header className="bg-blue-600 text-white p-4">
            <h1 className="text-2xl font-bold text-white flex items-center">
                <Image
                    src={digitaloceanLogo}
                    alt="Logo"
                    unoptimized
                    width={32}
                    height={32}
                    className="white-svg"
                />
                <span className="pl-4">{metadata.title}</span>
            </h1>
        </header>
    );
}
