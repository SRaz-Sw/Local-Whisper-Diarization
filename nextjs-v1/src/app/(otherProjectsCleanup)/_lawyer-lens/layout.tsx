'use client';

import React, { useEffect } from 'react';
import { usePreviewModalStore } from './stores/previewModalStore';
import { useSourceModalStore } from './stores/sourceModalStore';
import PreviewModal from './components/previewModal';
import SourceModal from './components/sourceModal';
import { FileUploadedData } from '@sraz-sw/carwise-shared';

export default function LawyerLensLayout({ children }: { children: React.ReactNode }) {
	// Get the open function from the stores
	const { open: openPreview } = usePreviewModalStore();
	const { isOpen: isSourceModalOpen, open: openSourceModal, close: closeSourceModal } = useSourceModalStore();

	// Register the global handlers for opening the preview modal
	useEffect(() => {
		if (typeof window !== 'undefined') {
			// Expose the open function to the global window object for easy access from anywhere
			(window as any).openFilePreview = (file: FileUploadedData) => {
				openPreview(file);
			};

			// Expose the source modal open function globally as well
			(window as any).openSourceModal = () => {
				openSourceModal();
			};
		}

		return () => {
			// Clean up when component unmounts
			if (typeof window !== 'undefined') {
				delete (window as any).openFilePreview;
				delete (window as any).openSourceModal;
			}
		};
	}, [openPreview, openSourceModal]);

	// Handler for when a source is added in the modal
	const handleSourceAdded = (url: string, file?: File, textContent?: string) => {
		// You can add any global handling here, or pass this to the child components via context
		// For now, we'll just trigger the window event that the page component listens to
		if (typeof window !== 'undefined' && window.dispatchEvent) {
			const sourceAddedEvent = new CustomEvent('sourceAdded', {
				detail: { url, file, textContent },
			});
			window.dispatchEvent(sourceAddedEvent);
		}
	};

	return (
		<>
			<div className="h-full">{children}</div>

			{/* Render the PreviewModal which will use the store to determine when to show */}
			<PreviewModal />

			{/* Render the SourceModal for adding new sources */}
			<SourceModal isOpen={isSourceModalOpen} onClose={closeSourceModal} onSourceAdded={handleSourceAdded} />
		</>
	);
}
