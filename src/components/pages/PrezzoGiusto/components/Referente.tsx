import { initials, type Referente } from "../utils/model";
import { DetailLine } from "./Surface";

export const RefPerson = ({ referral }: { referral: Referente }) => (
  <div className="flex items-center gap-3">
    {referral.photo ? (
      <img
        src={referral.photo}
        alt=""
        className="size-11 flex-none rounded-full object-cover"
      />
    ) : (
      <div className="grid size-11 flex-none place-items-center rounded-full bg-[#ffe3cb] text-xs font-bold text-blueText">
        {initials(referral.name)}
      </div>
    )}
    <div>
      <small className="block text-[11px] opacity-70">
        {referral.role || "Il tuo referente"}
      </small>
      <strong className="text-sm font-semibold">{referral.name}</strong>
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
