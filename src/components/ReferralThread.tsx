import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchReferralThread, postThreadMessage, fetchReferralBySlug } from "../services/referralService";
import {
  ReferralDTO,
  ReferralThreadEventDTO,
  MessageMetadata,
  OfferEventMetadata,
  ReferralEventMetadata,
  ContactEventMetadata,
  SystemAlertMetadata
} from "../types/referral";
import MessageBubble from "../components/MessageBubble";
import SystemActivity from "../components/SystemActivity";
import MessageInput from "../components/MessageInput";
import { supabase } from "../supabaseClient";
import ReferralActivity from "./ReferralActivity";
import OfferActivity from "./OfferActivity";
import ReferralDetails from "../pages/ReferralDetails";
import { approveClaim } from "../services/offerService";
import ApproveClaimModal from "../components/ApproveClaimModal";

const ReferralThread: React.FC = () => {
  const { slug } = useParams();
  const [events, setEvents] = useState<ReferralThreadEventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [referral, setReferral] = useState<ReferralDTO | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClaimId, setModalClaimId] = useState<string | null>(null);
  const [modalRedemptionValue, setModalRedemptionValue] = useState<string | null>(null);

const refreshThread = useCallback(async () => {
  if (!slug) return;
  setLoading(true);
  try {
    const updatedEvents = await fetchReferralThread(slug);
    setEvents(updatedEvents);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
      setError("Token not found.");
      return;
    }

    setToken(accessToken);

    const referralData = await fetchReferralBySlug(accessToken, slug);
    setReferral(referralData);
  } catch (err) {
    console.error("Failed to refresh thread:", err);
    setError("Failed to load thread");
  } finally {
    setLoading(false);
  }
}, [slug]);


  useEffect(() => {
    const loadUserId = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      setCurrentUserId(userId);
    };
    loadUserId();
  }, []);

  useEffect(() => {
    refreshThread();
  }, [refreshThread]);

    useEffect(() => {
    if (!slug || !token) return;

const ws = new WebSocket(`${__WS_BASE__}/referrals/${slug}/thread/ws?token=${token}`);

    ws.onmessage = (event) => {
      try {
        const newEvent: ReferralThreadEventDTO = JSON.parse(event.data);
        setEvents((prev) => [...prev, newEvent]);
      } catch (err) {
        console.error("Invalid WebSocket message format", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };

    return () => ws.close();
  }, [slug, token]);

  const handleSendMessage = async (message: string) => {
    if (!slug || !message) return;
    try {
      await postThreadMessage(slug, message);
      await refreshThread();
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

const handleApproveClaim = (claimId: string, redemptionValue?: string) => {
  setModalClaimId(claimId);
  setModalRedemptionValue(redemptionValue || "");
  setModalOpen(true);
};

const finalizeApproveClaim = async (redemptionValue: string, note?: string) => {
  if (!token || !modalClaimId) return;

  try {
    await approveClaim(modalClaimId, token, redemptionValue, note);
    alert("Claim approved!");
    refreshThread();
  } catch (err: any) {
    console.error(err);
    alert("Error approving claim: " + err.message);
  } finally {
    setModalOpen(false);
    setModalClaimId(null);
    setModalRedemptionValue(null);
  }
};

  if (loading || !currentUserId) return <p>Loading thread...</p>;
  if (error) return <p>{error}</p>;

  const isInputDisabled = (() => {
    if (!referral || !currentUserId) return true;
    if (referral.status === "CANCELLED") return true;

    if (
      (currentUserId === referral.prospectId && referral.prospectAcceptanceStatus === "REJECTED") ||
      (currentUserId === referral.businessId && referral.businessAcceptanceStatus === "REJECTED")
    ) {
      return true;
    }

    return false;
  })();

return (
  <div className="thread-container">
    {referral ? (
      <ReferralDetails
        referral={referral}
        onThreadUpdate={refreshThread}
        setReferral={setReferral}
      />
    ) : (
      <p className="text-center mt-6 text-red-600">Referral not found.</p>
    )}

    <div className="thread-content">
      {events.map((event) => {
        const metadata = event.metadata;
        const isMine = event.senderUserId === currentUserId;

        switch (event.eventType) {
          case "USER_MESSAGE": {
            const chat = metadata as MessageMetadata;
            return (
              <MessageBubble
                key={event.id}
                actorName={chat.actorName}
                message={chat.message}
                timestamp={event.createdAt}
                isMine={isMine}
                attachments={chat.attachmentUrls || []}
              />
            );
          }
          case "REFERRAL_EVENT": {
            return (
              <ReferralActivity
                key={event.id}
                slug={slug ?? ""}
                content={event.content}
                timestamp={event.createdAt}
              />
            );
          }
          case "OFFER_EVENT": {
            const offer = metadata as OfferEventMetadata;
            return (
              <OfferActivity
                key={event.id}
                timestamp={event.createdAt}
                actorName={offer.actorName}
                offerTitle={offer.offerTitle}
                recipientName={offer.recipientName}
                eventSubType={offer.eventSubType || "CLAIM"}
                content={event.content}
                metadata={event.metadata}
                currentUserId={currentUserId}
                isBusinessOnReferral={referral?.businessId === currentUserId}
                onApproveClaim={(claimId) =>
                  handleApproveClaim(claimId, offer.redemptionValue)
                }
              />
            );
          }
          default:
            return (
              <SystemActivity
                key={event.id}
                eventType={event.eventType}
                metadata={metadata as ContactEventMetadata | SystemAlertMetadata}
                timestamp={event.createdAt}
              />
            );
        }
      })}
    </div>

    {!isInputDisabled ? (
      <MessageInput onSend={handleSendMessage} />
    ) : (
      <p className="info-message">
        Messaging disabled — the referral has been cancelled or you have rejected it.
      </p>
    )}

    {/* Claim Approval Modal */}
    <ApproveClaimModal
      isOpen={modalOpen}
      defaultValue={modalRedemptionValue ?? ""}
      onClose={() => setModalOpen(false)}
      onApprove={finalizeApproveClaim}
    />
  </div>
);
};


export default ReferralThread;
