import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

const navItems = [
	{ id: 'summary', label: 'Summary' },
	{ id: 'charts', label: 'Charts' },
	{ id: 'analysis', label: 'Analysis' },
];

export default function Navbar({ onMenuClick, activeView }) {
	const [activeSection, setActiveSection] = useState('summary');

	useEffect(() => {
		if (activeView !== 'overview') {
			return; // Only track scroll position on overview page
		}

		const handleScroll = () => {
			const scrollPosition = window.scrollY + 120; // Offset for sticky navbar height

			// Find which section is currently in view
			for (const item of navItems) {
				const element = document.getElementById(item.id);
				if (element) {
					const rect = element.getBoundingClientRect();
					const elementTop = rect.top + window.scrollY;
					const elementBottom = elementTop + element.offsetHeight;

					if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
						setActiveSection(item.id);
						break;
					}
				}
			}
		};

		// Initial check
		handleScroll();

		// Add scroll listener
		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	}, [activeView]);

	const scrollToSection = (id) => {
		const element = document.getElementById(id);
		if (element) {
			// Add offset to account for the sticky navbar
			const top = element.getBoundingClientRect().top + window.pageYOffset - 100;
			window.scrollTo({ top, behavior: 'smooth' });

			// Immediately update active section for better UX
			setActiveSection(id);
		}
	};

	return (
		<header className="sticky top-0 bg-background/80 backdrop-blur-lg z-20 border-b border-border shadow-sm">
			<nav className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					<div className="flex items-center">
						<Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={onMenuClick}>
							<Menu className="h-6 w-6" />
						</Button>
						{activeView === 'overview' && (
							<ul className="hidden md:flex items-center space-x-1">
								{navItems.map((item) => (
									<li key={item.id}>
										<button
											onClick={() => scrollToSection(item.id)}
											className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
												activeSection === item.id
													? 'bg-blue-100 text-info shadow-sm'
													: 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
											}`}
										>
											{item.label}
										</button>
									</li>
								))}
							</ul>
						)}
					</div>

					{/* Mobile navigation for overview */}
					{activeView === 'overview' && (
						<div className="md:hidden">
							<select
								value={activeSection}
								onChange={(e) => scrollToSection(e.target.value)}
								className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-background"
							>
								{navItems.map((item) => (
									<option key={item.id} value={item.id}>
										{item.label}
									</option>
								))}
							</select>
						</div>
					)}
				</div>
			</nav>
		</header>
	);
}
