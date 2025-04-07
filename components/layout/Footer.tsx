"use client";

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';

type FooterItem = {
  title: string;
  content: React.ReactNode;
};

export default function Footer() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FooterItem | null>(null);
  
  const openModal = useCallback((item: FooterItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  }, []);
  
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setTimeout(() => setSelectedItem(null), 300);
  }, []);
  
  // 배경 클릭 핸들러 - 모달 외부 클릭 시 닫기
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // 현재 이벤트의 target이 실제로 배경 요소인 경우에만 닫기
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }, [closeModal]);
  
  // 외부 클릭 감지 이벤트 핸들러
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (modalOpen && event.key === 'Escape') {
        closeModal();
      }
    };

    // 모달이 열려있을 때만 이벤트 리스너 추가
    if (modalOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [modalOpen, closeModal]);
  
  const footerItems: FooterItem[] = [
    {
      title: "Privacy Policy",
      content: (
        <div className="space-y-3">
          <p className="text-sm md:text-base">Last Updated: April 6, 2025</p>
          <p className="text-sm md:text-base">Effective Date: April 6, 2025</p>
          
          <h3 className="text-base md:text-lg font-semibold">Company Information</h3>
          <p className="text-sm md:text-base">
            Company Name: frrai<br/>
            Representative: Park Sung-chul<br/>
            Business Registration Number: 785-43-00980<br/>
            Email: support@frrai.com
          </p>
          
          <p className="text-sm md:text-base">frrai (hereinafter "we" or "us") values your privacy and complies with applicable laws. This Privacy Policy explains what information we collect and how we process it.</p>
          
          <h3 className="text-base md:text-lg font-semibold">1. Information We Collect</h3>
          <p className="text-sm md:text-base"><strong>Required Information:</strong><br/>
          Via Clerk login: Username, profile picture, email address.</p>
          <p className="text-sm md:text-base"><strong>Optional Information:</strong><br/>
          During payment: Payment method details (e.g., card number, processed via payment provider).<br/>
          Customer support inquiries: Inquiry content and contact info.</p>
          <p className="text-sm md:text-base"><strong>Automatically Collected Information:</strong><br/>
          Service usage history, IP address, device information.</p>
          
          <h3 className="text-base md:text-lg font-semibold">2. Purpose of Collection</h3>
          <p className="text-sm md:text-base">
            Account management and service provision.<br/>
            Payment processing and subscription management.<br/>
            Responding to inquiries and improving the service.
          </p>
          
          <h3 className="text-base md:text-lg font-semibold">3. Retention and Deletion</h3>
          <p className="text-sm md:text-base"><strong>Retention Periods:</strong><br/>
            Account info: Deleted immediately upon account deletion.<br/>
            Generated images: Generated images are not stored on our servers. Only shared images are stored for 60 days from the time of sharing, then deleted.<br/>
            Payment info: Retained for the legally required period (e.g., 5 years).
          </p>
          <p className="text-sm md:text-base">Deletion Method: Electronic files are deleted irretrievably; physical records are shredded.</p>
          
          <h3 className="text-base md:text-lg font-semibold">4. Sharing with Third Parties</h3>
          <p className="text-sm md:text-base">We share data only with Clerk (login service) and payment providers; otherwise, data is not shared unless required by law.</p>
          
          <h3 className="text-base md:text-lg font-semibold">5. Your Rights</h3>
          <p className="text-sm md:text-base">
            You may request access, correction, or deletion of your personal information (contact: support@frrai.com).<br/>
            Account deletion is available directly via Clerk.
          </p>
          
          <h3 className="text-base md:text-lg font-semibold">6. Security Measures</h3>
          <p className="text-sm md:text-base">
            We use encryption and firewalls to protect your data.<br/>
            We are not responsible for damages due to your negligence (e.g., password leaks).
          </p>
          
          <h3 className="text-base md:text-lg font-semibold">7. Policy Updates</h3>
          <p className="text-sm md:text-base">Changes to this Privacy Policy will be announced on the main page or via email.</p>
          
          <h3 className="text-base md:text-lg font-semibold">8. Contact</h3>
          <p className="text-sm md:text-base">For privacy-related inquiries, reach out to support@frrai.com.</p>
        </div>
      )
    },
    {
      title: "Terms of Service",
      content: (
        <div className="space-y-3">
          <p className="text-sm md:text-base">Last Updated: April 6, 2025</p>
          <p className="text-sm md:text-base">Effective Date: April 6, 2025</p>
          
          <h3 className="text-base md:text-lg font-semibold">Company Information</h3>
          <p className="text-sm md:text-base">
            Company Name: frrai<br/>
            Representative: Park Sung-chul<br/>
            Business Registration Number: 785-43-00980<br/>
            Email: support@frrai.com
          </p>
          
          <p className="text-sm md:text-base">Welcome to frrai (hereinafter "we," "us," or "the Platform"). These Terms of Service (hereinafter "Terms") govern your (hereinafter "User" or "you") use of our AI-powered prompt-based advertising image generation service. Please read these Terms carefully before using the service. By accessing or using the service, you agree to be bound by these Terms.</p>
          
          <h3 className="text-base md:text-lg font-semibold">1. Service Overview</h3>
          <p className="text-sm md:text-base">frrai is a platform that allows users to generate images using AI based on text prompts.</p>
          <p className="text-sm md:text-base"><strong>Key features:</strong><br/>
            Image generation: Input prompts to create AI-generated images.<br/>
            Sharing: Share generated image cards on the main page and community page.<br/>
            Card features: Like button, comment creation/deletion, user info display, card deletion.<br/>
            Recent search result view: Displays 2 images.<br/>
            Login: Authentication via Clerk, syncing username and profile picture.
          </p>
          
          <h3 className="text-base md:text-lg font-semibold">2. Account and Registration</h3>
          <p className="text-sm md:text-base">
            Users create accounts via Clerk; account deletion is handled directly through Clerk.<br/>
            You are responsible for maintaining the accuracy and security of your account information.<br/>
            Unauthorized use of another's account or transferring account information is prohibited.
          </p>
          
          <h3 className="text-base md:text-lg font-semibold">3. Subscription Plans and Payment</h3>
          <p className="text-sm md:text-base"><strong>Subscription Plans:</strong><br/>
            Free (Starter): Limited to 2 image generations per month.<br/>
            Pro (Premium): Up to 50 image generations per month. If used at least once in a given month, refunds are not available for that month.<br/>
            Team: In development.
          </p>
          <p className="text-sm md:text-base"><strong>Payment and Renewal:</strong><br/>
            Pro plans come with an auto-renewal option, which is enabled by default.<br/>
            Payment for the next billing cycle is automatically processed on the renewal date.<br/>
            You may disable auto-renewal at any time.
          </p>
          <p className="text-sm md:text-base"><strong>Subscription Cancellation Policy:</strong><br/>
            Upon cancellation, you may continue using the Premium service until the end of the current billing period (renewal date).<br/>
            Cancellation stops auto-renewal, and no additional charges will be incurred on the next billing date.<br/>
            After the renewal date, your account will automatically revert to the Free plan.
          </p>
          <p className="text-sm md:text-base"><strong>Refund Policy:</strong><br/>
            Full refunds are available within 14 days of the subscription start date, processed via customer support.<br/>
            No refunds are available after 14 days from the subscription start date.<br/>
            If the service is used at least once in a given month, no refunds will be issued for that month.<br/>
            All refunds are processed exclusively through customer support inquiries.
          </p>
          
          <h3 className="text-base md:text-lg font-semibold">4. Content and Liability</h3>
          <p className="text-sm md:text-base">
            Image Generation: Images are generated based on your prompts; we are not responsible for their content.<br/>
            Sharing and Storage: Generated images are not stored on our servers. Only images shared by users are stored on the server for 60 days from the time they are posted on the main page or community page, after which they are automatically deleted.<br/>
            You may not generate or share illegal content or content that infringes on others' rights.<br/>
            Commercial Use and Legal Responsibility: You may use generated images for commercial purposes. However, you are solely responsible for any legal consequences (including copyright infringement, portrait rights violations, or other legal disputes) arising from the use of the images, and we bear no liability for such issues.<br/>
            We reserve the right to remove inappropriate content or restrict accounts.
          </p>
          
          <h3 className="text-base md:text-lg font-semibold">5. Limitation of Liability</h3>
          <p className="text-sm md:text-base">
            We do not guarantee the quality, accuracy, or legality of AI-generated images.<br/>
            We are not liable for any losses (e.g., data loss, financial damages) arising from your use of the service.<br/>
            We may modify, suspend, or terminate the service without prior notice.
          </p>
          
          <h3 className="text-base md:text-lg font-semibold">6. Intellectual Property</h3>
          <p className="text-sm md:text-base">
            Images you generate are considered your property and may be used for commercial purposes. However, we retain a non-exclusive right to display, store, and share shared images within the platform.<br/>
            Our AI model, software, and designs are our intellectual property and may not be copied or used without permission.
          </p>
          
          <h3 className="text-base md:text-lg font-semibold">7. Termination and Account Deletion</h3>
          <p className="text-sm md:text-base">
            You may delete your account at any time via Clerk.<br/>
            We may suspend or delete your account without notice for violations of these Terms.
          </p>
          
          <h3 className="text-base md:text-lg font-semibold">8. Governing Law and Dispute Resolution</h3>
          <p className="text-sm md:text-base">These Terms are governed by the laws of the Republic of Korea, and disputes will be resolved in the Seoul Central District Court.</p>
          
          <h3 className="text-base md:text-lg font-semibold">9. Contact</h3>
          <p className="text-sm md:text-base">For questions about these Terms, contact customer support at support@frrai.com.</p>
        </div>
      )
    },
    {
      title: "AI Disclosure",
      content: (
        <div className="space-y-3">
          <p className="text-sm md:text-base">Last Updated: April 6, 2025</p>
          <p className="text-sm md:text-base">Effective Date: April 6, 2025</p>
          
          <h3 className="text-base md:text-lg font-semibold">Company Information</h3>
          <p className="text-sm md:text-base">
            Company Name: frrai<br/>
            Representative: Park Sung-chul<br/>
            Business Registration Number: 785-43-00980<br/>
            Email: support@frrai.com
          </p>
          
          <h3 className="text-base md:text-lg font-semibold">AI Image Generation Disclosure</h3>
          <p className="text-sm md:text-base">frrai uses artificial intelligence (AI) to generate images based on user prompts. Please be aware of the following:</p>
          
          <ul className="list-disc pl-5 space-y-1">
            <li className="text-sm md:text-base">Images are generated by AI and may not represent real people, places, or events</li>
            <li className="text-sm md:text-base">AI-generated content may contain biases or inaccuracies</li>
            <li className="text-sm md:text-base">We implement safety measures but cannot guarantee perfect results</li>
            <li className="text-sm md:text-base">Users are responsible for the prompts they provide and the resulting images</li>
            <li className="text-sm md:text-base">Storage Policy: Generated images are not stored on our servers. Only shared images are stored for 60 days from the time of sharing.</li>
            <li className="text-sm md:text-base">Commercial Use and Legal Responsibility: Generated images may be used for commercial purposes. However, you are solely responsible for any legal consequences (including copyright infringement, portrait rights violations, or other legal disputes) arising from the use of the images, and we bear no liability for such issues.</li>
          </ul>
          
          <p className="text-sm md:text-base">If you encounter inappropriate content, please report it immediately.</p>
          
          <p className="text-sm md:text-base">Contact: support@frrai.com</p>
        </div>
      )
    },
    {
      title: "Cookies Policy",
      content: (
        <div className="space-y-3">
          <p className="text-sm md:text-base">Last Updated: April 6, 2025</p>
          <p className="text-sm md:text-base">Effective Date: April 6, 2025</p>
          
          <h3 className="text-base md:text-lg font-semibold">Company Information</h3>
          <p className="text-sm md:text-base">
            Company Name: frrai<br/>
            Representative: Park Sung-chul<br/>
            Business Registration Number: 785-43-00980<br/>
            Email: support@frrai.com
          </p>
          
          <h3 className="text-base md:text-lg font-semibold">Cookies Policy</h3>
          <p className="text-sm md:text-base">frrai uses cookies on our website to enhance your browsing experience, analyze site traffic, and personalize content.</p>
          
          <h3 className="text-base md:text-lg font-semibold">Types of Cookies We Use</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li className="text-sm md:text-base"><strong>Essential Cookies:</strong> Required for basic website functionality</li>
            <li className="text-sm md:text-base"><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our site</li>
            <li className="text-sm md:text-base"><strong>Preference Cookies:</strong> Allow the website to remember choices you make (e.g., language settings)</li>
            <li className="text-sm md:text-base"><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
          </ul>
          
          <p className="text-sm md:text-base">You can control cookies through your browser settings. However, disabling certain cookies may limit your use of our website.</p>
          
          <p className="text-sm md:text-base">Contact: support@frrai.com</p>
        </div>
      )
    },
  ];

  return (
    <footer className="bg-transparent py-4 mt-auto w-full border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-row items-center justify-center flex-wrap">
          <div className="flex items-center space-x-4 flex-wrap justify-center">
            {footerItems.map((item) => (
              <button
                key={item.title}
                onClick={() => openModal(item)}
                className="text-xs md:text-sm text-gray-500 hover:text-blue-600 transition-colors px-2 py-1"
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="text-center text-xs text-gray-400 mt-2">
        © {new Date().getFullYear()} AI Image Generation. All rights reserved.
      </div>
      
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200"
          onClick={handleBackdropClick}
        >
          <div 
            className="bg-white w-[90%] max-w-md md:max-w-xl max-h-[80vh] overflow-y-auto mx-auto rounded-lg p-6 relative shadow-xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2 pb-2 text-center">
              <h2 className="text-lg md:text-xl font-bold">
                {selectedItem?.title}
              </h2>
            </div>
            
            <div className="py-3 text-gray-700 text-sm md:text-base">
              {selectedItem?.content}
            </div>
            
            <div className="flex justify-center mt-4">
              <button 
                className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
} 