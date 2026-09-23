# TIFFAS GitHub Admin Setup

The storefront no longer depends on Render. The existing Render service/database are intentionally left untouched.

## Live storefront

GitHub Pages:
https://tiffasbeautyandcosmetics.github.io/Tiffasbeauty-cosmetics-store/

## Admin

Open:
https://tiffasbeautyandcosmetics.github.io/Tiffasbeauty-cosmetics-store/admin/

The admin writes product changes directly to this GitHub repository.

### First-time admin setup

1. Open GitHub's fine-grained token page:
   https://github.com/settings/personal-access-tokens/fine-grained/new
2. Create a token with access limited to:
   Tiffasbeautyandcosmetics/Tiffasbeauty-cosmetics-store
3. Repository permission:
   Contents → Read and write
4. Do not add unrelated repositories or permissions.
5. Copy the token and paste it into the TIFFAS Admin login page.
6. The token is kept only in the current browser session.

## Product management

The admin can:
- add products
- edit products
- delete products
- change price
- change stock quantity
- toggle in-stock status
- edit description
- upload a product image

Images are resized in the browser and committed to:
images/products/

The catalogue is stored at:
catalog/products.json

Saving the catalogue creates a Git commit. The existing GitHub Pages workflow then redeploys the storefront.

## Bank transfer

Bank details are stored in:
store-settings.json

Open Bank settings in the admin and enter:
- Bank name
- Account name
- Account number
- Branch
- SWIFT/BIC (when applicable)
- Payment instructions
- WhatsApp number

The storefront checkout then shows those details and generates a unique order reference.

## Existing Render files

No Render files/services/databases were deleted. They remain in the repository/account for your records.

The storefront itself no longer calls the Render backend.
