import { initials, type Referente } from "../utils/model";
import { DetailLine } from "./Surface";

export const RefPerson = ({ referral, large }: { referral: Referente; large?: boolean }) => (
  <div className={`flex items-center ${large ? "gap-4" : "gap-3"}`}>
    {referral.photo ? (
      <img
        src={referral.photo}
        alt=""
        className={`${large ? "size-14" : "size-11"} flex-none rounded-full object-cover`}
      />
    ) : (
      <div
        className={`grid ${large ? "size-14 text-sm" : "size-11 text-xs"} flex-none place-items-center rounded-full bg-[#ffe3cb] font-bold text-blueText`}
      >
        {initials(referral.name)}
      </div>
    )}
    <div>
      <small className={`block ${large ? "text-xs" : "text-[11px]"} opacity-70`}>
        {referral.role || "Il tuo referente"}
      </small>
      <strong className={`${large ? "text-base" : "text-sm"} font-semibold`}>{referral.name}</strong>
    </div>
  </div>
);

export const Contact = ({ referral }: { referral: Referente }) => (
  <>
    <RefPerson referral={referral} />
    <DetailLine label="Telefono">{referral.phone}</DetailLine>
    <DetailLine label="Email">{referral.email}</DetailLine>
  </>
);
